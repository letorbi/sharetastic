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
  log.Println("TODO download")
}

func uploadFile(w http.ResponseWriter, r *http.Request) {
  os.MkdirAll(filedir, os.ModePerm)
  out, err := ioutil.TempFile(filedir, "incoming.*.zip")
  if err != nil {
    http.Error(w, http.StatusText(500), 500)
    log.Panic(err)
  }
  defer out.Close()
  io.Copy(out, r.Body)
}
