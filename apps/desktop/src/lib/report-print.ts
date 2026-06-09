export function triggerReportPrint(): void {
  document.body.classList.add("printing-report");
  window.print();
  window.setTimeout(() => {
    document.body.classList.remove("printing-report");
  }, 500);
}
