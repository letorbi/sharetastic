//
// Sharetastic Daemon
// Copyright (C) 2020 Torben Haase <https://pixelsvsbytes.com>
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.
//
///////////////////////////////////////////////////////////////////////////////

package main

import (
  "io"
  "io/ioutil"
  "log"
  "net/http"
  "os"
  "os/user"
  "path/filepath"
)

var filedir string

func main() {
  usr, err := user.Current()
  if err != nil {
    log.Fatal(err)
    return;
  }
  filedir = usr.HomeDir + "/.sharetastic/files";

  fs := http.FileServer(http.Dir("./static"))
  http.Handle("/", http.StripPrefix("/", fs))
  http.HandleFunc("/files/", files)
  http.ListenAndServe(":8090", nil)
}

func files(res http.ResponseWriter, req *http.Request) {
  defer func() {
    if r := recover(); r != nil {
      http.Error(res, http.StatusText(500), 500)
      log.Println("recovered from panic")
    }
  }()

  switch req.Method {
    case "GET":     
      downloadFile(res, req);
    case "POST":
      uploadFile(res, req);
    default:
      http.Error(res, http.StatusText(405), 405)
  }
}

func downloadFile(res http.ResponseWriter, req *http.Request) {
  log.Println("TODO download")
}

func uploadFile(res http.ResponseWriter, req *http.Request) {
  var out *os.File
  var err error

  err = os.MkdirAll(filedir, os.ModePerm)
  if err == nil {
    out, err = ioutil.TempFile(filedir, "*")
  }
  if err == nil {
    defer func() { if err != nil { out.Close() } }()
    _, err = io.Copy(out, req.Body)
  }
  if err == nil {
    name := []byte(filepath.Base(out.Name()))
    _, err = res.Write(name)
  }
  if (err == nil) {
    err = out.Close()
  }
  handleError(res, err)
}

func handleError(res http.ResponseWriter, err error) {
  if err != nil {
    log.Println(err)
    http.Error(res, http.StatusText(500), 500)
  }
}
