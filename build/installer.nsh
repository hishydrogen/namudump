; 나무덤프 NSIS 설치 프로그램 추가 스크립트(electron-builder가 buildResources에서 자동으로 넣는다)
;
; 바탕 화면 바로가기를 electron-builder 대신 여기서 만든다. electron-builder는 바로가기를 만든 뒤
; 그 파일을 다시 열어 앱 ID(AUMID)를 덧써 넣는데(WinShell::SetLnkAUMI), Parallels처럼 맥 바탕 화면을
; 공유하는 환경에서는 이 두 번째 쓰기가 변환되며 실행 대상이 사라져 빈 아이콘, 실행 안 되는 바로가기가 된다.
; 시작 메뉴 바로가기는 electron-builder가 그대로 만들고 앱 ID도 거기에만 넣는다(알림, 작업 표시줄 묶음은 그걸로 충분).

!define NAMUDUMP_DESKTOP_LINK "$DESKTOP\${SHORTCUT_NAME}.lnk"

; 3.1.x까지는 설치 마법사에서 '모든 사용자'를 고를 수 있었다. 원클릭 설치는 현재 사용자 계정에만 설치하고
; 그쪽(HKCU)의 이전 버전만 지우므로, 모든 사용자용 이전 설치가 있으면 따로 지우도록 알린다
!macro customInit
  ${IfNot} ${Silent}
    ReadRegStr $0 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
    ReadRegStr $1 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
    ${If} $0 != ""
    ${AndIf} $1 == ""
      MessageBox MB_OKCANCEL|MB_ICONINFORMATION "이 컴퓨터에 '모든 사용자'용으로 설치된 이전 나무덤프가 있습니다.$\r$\n$\r$\n새 버전은 현재 사용자 계정에 설치됩니다. 설치가 끝나면 Windows 설정의 '앱'에서 이전 나무덤프를 제거해 주세요. 설정, 즐겨찾기, 방문 기록은 그대로 남습니다." IDOK +2
      Quit
    ${EndIf}
  ${EndIf}
!macroend

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
