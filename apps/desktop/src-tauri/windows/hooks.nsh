; Cicibyte kurulum dizini — NSIS + MUI varsayılan yolu
!define MUI_INSTALLDIR "$PROGRAMFILES\Cicibyte\CleanLedger"

!macro NSIS_HOOK_PREINSTALL
  ${If} ${RunningX64}
    StrCpy $INSTDIR "$PROGRAMFILES64\Cicibyte\CleanLedger"
  ${Else}
    StrCpy $INSTDIR "$PROGRAMFILES\Cicibyte\CleanLedger"
  ${EndIf}
  SetOutPath $INSTDIR
!macroend
