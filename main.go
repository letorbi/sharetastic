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

  staticFs := http.FileServer(http.Dir("./static"))
  downloadFs := http.FileServer(http.Dir(filedir))

  http.Handle("/", http.StripPrefix("/", muxMethod(staticFs, nil)))
  http.Handle("/files/", http.StripPrefix("/files/", muxMethod(hideRoot(downloadFs), upload())))
  http.ListenAndServe(":8090", nil)
}

func muxMethod(get http.Handler, post http.Handler) http.Handler {
  return http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
    switch req.Method {
      case "GET":
        if get != nil {
          get.ServeHTTP(res, req)
        } else {
          http.Error(res, http.StatusText(405), 405)
        }
      case "POST":
        if post != nil {
          post.ServeHTTP(res, req)
        } else {
          http.Error(res, http.StatusText(405), 405)
        }
      default:
        http.Error(res, http.StatusText(405), 405)
    }
  })
}

func hideRoot(next http.Handler) http.Handler {
  return http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
    if len(req.URL.Path) == 0 {
      http.Error(res, http.StatusText(404), 404)
      return
    }
    next.ServeHTTP(res, req)
  })
}

func upload() http.Handler {
  return http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
    var out *os.File
    var err error
    
    defer func() {
      if err != nil {
        log.Println(err)
        http.Error(res, http.StatusText(500), 500)
      }
    }()

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
  })
}
