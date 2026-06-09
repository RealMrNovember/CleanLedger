; Cicibyte marka klasörü altına kurulum: C:\Program Files\Cicibyte\CleanLedger
!macro NSIS_HOOK_PREINSTALL
  ${If} ${RunningX64}
    StrCpy $INSTDIR "$PROGRAMFILES64\Cicibyte\${PRODUCTNAME}"
  ${Else}
    StrCpy $INSTDIR "$PROGRAMFILES\Cicibyte\${PRODUCTNAME}"
  ${EndIf}
  SetOutPath $INSTDIR
!macroend
