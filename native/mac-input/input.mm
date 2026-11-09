// 맥 트랙패드, 매직 마우스의 좌우 쓸기를 화면(web/app.js의 ND_swipe)에 넘긴다.
//
// Electron(크로미움)은 스크롤 입력의 위상(손가락을 댔는지, 뗐는지, 관성인지)을 웹에 알려 주지 않고,
// 쓸어서 앞뒤로 가는 기능도 없다. 그래서 1.0의 mac_chrome.py처럼 NSEvent를 직접 보고 좌우 쓸기를 가려낸다.
// 세로 스크롤, 튕기기, 마우스 휠은 크로미움이 합성 스레드에서 그대로 처리한다(그래야 끊기지 않는다).
// 웹이 "이번 동작은 쓸기로 맡는다"고 알리면(setCapture) 그 동작의 나머지 입력은 크로미움에 넘기지 않는다.
#import <AppKit/AppKit.h>
#include <node_api.h>
#include <cmath>
#include <cstring>
#include <unordered_set>

namespace {

enum Kind { kScroll = 0, kSwipe = 1, kWheel = 2 };
enum SwipeKind { kBegin = 0, kMove = 1, kEnd = 2 };

struct Msg {
  int kind;
  uint64_t view;        // 이벤트가 온 창의 contentView 주소(Electron의 getNativeWindowHandle과 같다)
  int ph, mph, sub;
  double dx, dy, x, y;
};

const double kSwipeDecide = 6.0;     // 가로, 세로를 판단하기 시작하는 움직임(점)

napi_threadsafe_function g_tsfn = nullptr;
id g_monitor = nil;
// 입력을 넘길 창(문서 창)의 contentView들. 파일 선택 창, 개발자 도구 등 다른 창은 건드리지 않는다
std::unordered_set<uint64_t> g_views;
struct {
  int lock = -1;                     // -1: 아직 모름, 0: 세로 스크롤, 1: 가로 쓸기
  double ax = 0, ay = 0;
  bool swallow = false;
} G;

void post(const Msg& m) {
  if (!g_tsfn) return;
  Msg* p = new Msg(m);
  if (napi_call_threadsafe_function(g_tsfn, p, napi_tsfn_nonblocking) != napi_ok) delete p;
}

void setNum(napi_env env, napi_value o, const char* k, double v) {
  napi_value n;
  napi_create_double(env, v, &n);
  napi_set_named_property(env, o, k, n);
}

void callJs(napi_env env, napi_value cb, void*, void* data) {
  Msg* m = static_cast<Msg*>(data);
  if (env && cb) {
    napi_value o, view, undef;
    napi_create_object(env, &o);
    setNum(env, o, "k", m->kind);
    napi_create_bigint_uint64(env, m->view, &view);
    napi_set_named_property(env, o, "view", view);
    setNum(env, o, "ph", m->ph);
    setNum(env, o, "mph", m->mph);
    setNum(env, o, "sub", m->sub);
    setNum(env, o, "dx", m->dx);
    setNum(env, o, "dy", m->dy);
    setNum(env, o, "x", m->x);
    setNum(env, o, "y", m->y);
    napi_get_undefined(env, &undef);
    napi_call_function(env, undef, cb, 1, &o, nullptr);
  }
  delete m;
}

// 정밀 스크롤(트랙패드, 매직 마우스) 하나를 처리한다. 크로미움에 넘기지 말아야 하면 true.
bool handlePrecise(NSEvent* e, uint64_t view, double x, double y) {
  NSEventPhase ph = e.phase, mph = e.momentumPhase;
  if (ph & (NSEventPhaseBegan | NSEventPhaseMayBegin)) { G.lock = -1; G.ax = 0; G.ay = 0; G.swallow = false; }
  // 세로 스크롤과 튕기기는 크로미움(맥 기본 고무줄 효과)에 맡기고, 여기서는 좌우 쓸기만 가려낸다
  if ((ph & NSEventPhaseMayBegin) && !(ph & NSEventPhaseBegan)) return false;
  // 손가락 방향 기준(자연스러운 스크롤 설정과 상관없이 손가락을 오른쪽으로 쓸면 양수)
  double fx = e.scrollingDeltaX * (e.isDirectionInvertedFromDevice ? 1 : -1);
  bool ended = ph & (NSEventPhaseEnded | NSEventPhaseCancelled);
  if (ph) {
    if (G.lock < 0) {
      G.ax += fx;
      G.ay += e.scrollingDeltaY;
      if (std::fabs(G.ax) + std::fabs(G.ay) < kSwipeDecide) return false;   // 아직 판단하기엔 짧다
      G.lock = std::fabs(G.ax) > 1.5 * std::fabs(G.ay) ? 1 : 0;
      if (G.lock == 1) {
        post({kSwipe, view, 0, 0, kBegin, G.ax, 0, x, y});
        if (ended) post({kSwipe, view, 0, 0, kEnd, 0, 0, x, y});
      }
      return G.swallow;
    }
    if (G.lock == 1) post({kSwipe, view, 0, 0, ended ? kEnd : kMove, fx, 0, x, y});
    return G.swallow;
  }
  return mph && G.swallow;    // 웹이 가져간 동작의 관성도 크로미움에 넘기지 않는다
}

NSEvent* onScroll(NSEvent* e) {
  @try {
    NSWindow* w = e.window;
    NSView* v = w.contentView;
    if (!v) return e;
    uint64_t view = (uint64_t)(uintptr_t)(__bridge void*)v;
    if (!g_views.count(view)) return e;
    NSPoint p = [v convertPoint:e.locationInWindow fromView:nil];
    double x = p.x, y = v.isFlipped ? p.y : v.bounds.size.height - p.y;
    // 칸 단위 휠은 크로미움이 합성 스레드에서 부드럽게 굴리므로 건드리지 않는다
    if (e.hasPreciseScrollingDeltas) return handlePrecise(e, view, x, y) ? nil : e;
  } @catch (NSException*) {
  }
  return e;
}

napi_value Start(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value cb;
  napi_get_cb_info(env, info, &argc, &cb, nullptr, nullptr);
  if (argc < 1 || g_tsfn) return nullptr;
  napi_value name;
  napi_create_string_utf8(env, "nd-mac-input", NAPI_AUTO_LENGTH, &name);
  napi_create_threadsafe_function(env, cb, nullptr, name, 0, 1, nullptr, nullptr, nullptr, callJs, &g_tsfn);
  // 앱이 꺼질 때 막히지 않게 이벤트 루프를 붙잡지 않는다
  napi_unref_threadsafe_function(env, g_tsfn);
  g_monitor = [NSEvent addLocalMonitorForEventsMatchingMask:NSEventMaskScrollWheel
                                                    handler:^NSEvent*(NSEvent* e) { return onScroll(e); }];
  return nullptr;
}

// 웹이 이번 스크롤 동작을 직접 맡겠다고 알릴 때(쓸기, 튕기기). 다음 동작이 시작되면 풀린다.
napi_value SetCapture(napi_env, napi_callback_info) {
  G.swallow = true;
  return nullptr;
}

// watch(주소, 켜기): Electron의 getNativeWindowHandle()이 주는 contentView 주소를 등록하거나 뺀다
napi_value Watch(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (argc < 2) return nullptr;
  uint64_t view = 0;
  bool lossless = false, on = false;
  napi_get_value_bigint_uint64(env, args[0], &view, &lossless);
  napi_get_value_bool(env, args[1], &on);
  if (on) g_views.insert(view); else g_views.erase(view);
  return nullptr;
}

napi_value Stop(napi_env, napi_callback_info) {
  if (g_monitor) { [NSEvent removeMonitor:g_monitor]; g_monitor = nil; }
  if (g_tsfn) { napi_release_threadsafe_function(g_tsfn, napi_tsfn_abort); g_tsfn = nullptr; }
  return nullptr;
}

napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor props[] = {
    {"start", nullptr, Start, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"setCapture", nullptr, SetCapture, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"watch", nullptr, Watch, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"stop", nullptr, Stop, nullptr, nullptr, nullptr, napi_default, nullptr},
  };
  napi_define_properties(env, exports, 4, props);
  return exports;
}

}  // namespace

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
