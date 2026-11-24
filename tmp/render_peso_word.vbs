Option Explicit
Dim app, doc, args
Set args = WScript.Arguments
Set app = CreateObject("Word.Application")
app.Visible = False
app.DisplayAlerts = 0
Set doc = app.Documents.Open(args(0), False, True, False)
WScript.Echo "Pages: " & doc.ComputeStatistics(2)
doc.SaveAs2 args(1), 17
WScript.Echo "PDF completed"
doc.Close False
If app.Documents.Count = 0 Then app.Quit
