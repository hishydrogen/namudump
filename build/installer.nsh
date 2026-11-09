; 나무덤프 NSIS 설치 프로그램 추가 스크립트(electron-builder가 buildResources에서 자동으로 넣는다)
;
; 바탕 화면 바로가기를 electron-builder 대신 여기서 만든다. electron-builder는 바로가기를 만든 뒤
; 그 파일을 다시 열어 앱 ID(AUMID)를 덧써 넣는데(WinShell::SetLnkAUMI), Parallels처럼 맥 바탕 화면을
; 공유하는 환경에서는 이 두 번째 쓰기가 변환되며 실행 대상이 사라져 빈 아이콘, 실행 안 되는 바로가기가 된다.
; 시작 메뉴 바로가기는 electron-builder가 그대로 만들고 앱 ID도 거기에만 넣는다(알림, 작업 표시줄 묶음은 그걸로 충분).

!define NAMUDUMP_DESKTOP_LINK "$DESKTOP\${SHORTCUT_NAME}.lnk"

!macro customInstall
  ; 새로 설치하면 만들고, 업데이트 때는 사용자가 남겨 둔 경우에만 다시 만든다
  ${ifNot} ${isUpdated}
  ${orIf} ${FileExists} "${NAMUDUMP_DESKTOP_LINK}"
    Delete "${NAMUDUMP_DESKTOP_LINK}"
    CreateShortCut "${NAMUDUMP_DESKTOP_LINK}" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
  ${endIf}
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

; createDesktopShortcut: false면 electron-builder의 제거 프로그램이 바탕 화면 바로가기를 지우지 않으므로 직접 지운다
!macro customUnInstall
  ${ifNot} ${isUpdated}
    Delete "${NAMUDUMP_DESKTOP_LINK}"
  ${endIf}
!macroend
