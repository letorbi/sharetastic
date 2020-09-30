package main

import (
  "fmt"
  "net/http"
)

func main() {
  fs := http.FileServer(http.Dir("./static"))
  http.Handle("/", http.StripPrefix("/", fs))
  http.HandleFunc("/files/", files)
  http.ListenAndServe(":8090", nil)
}

func files(w http.ResponseWriter, r *http.Request) {
  switch r.Method {
    case "GET":     
      downloadFile(w, r);
    case "POST":
      uploadFile(w, r);
    default:
      http.Error(w, http.StatusText(405), 405)
  }
}

func downloadFile(w http.ResponseWriter, r *http.Request) {
  fmt.Fprintf(w, "TODO download\n")
}

func uploadFile(w http.ResponseWriter, r *http.Request) {
  fmt.Fprintf(w, "TODO upload\n")
}
