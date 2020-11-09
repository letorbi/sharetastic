var uploadFiles = new Array();

// DOM

function saveAs(object, filename) {
  var link = document.createElement("a");
  link.href = URL.createObjectURL(object);
  link.download = filename;
  link.click();
}

function sendAsMail(href) {
  var link = document.createElement("a");
  var subject = encodeURIComponent("I've sent you some files via Sharetastic");
  var body = encodeURIComponent("Hello,\n\nI've sent you some files via Sharetastic. Here is the download link:\n\n" + href + "\n\nThe link is valid for three days.\n\nRegards");
  link.href = "mailto:?subject=" + subject + "&body=" + body;
  link.click();
}

function copyToClipboard(href) {
  var field = document.createElement("input");
  document.body.appendChild(field);
  field.type = "text";
  field.value = href;
  field.select();
  field.setSelectionRange(0, 99999);
  document.execCommand("copy");
  document.body.removeChild(field);
}

function disableFiles() {
  var files = document.getElementById("Files");
  var buttons = files.getElementsByTagName("button");
  var labels = files.getElementsByTagName("label");
  for (var i=0; i<buttons.length; i++)
    buttons[i].disabled = true;
  for (var i=0; i<labels.length; i++)
    labels[i].classList.add("disabled");
}

function selectClass(node, cls, clsArr) {
  for (var i = 0; i < clsArr.length; i++) {
    if (clsArr[i] == cls)
      node.classList.add(clsArr[i]);
    else
      node.classList.remove(clsArr[i]);
  }
}

function showWizard(step) {
  var wizard = document.getElementById("Wizard");
  selectClass(wizard, step, ["upload", "progress", "finish"]);
}

function showFiles(step) {
  var files = document.getElementById("Files");
  selectClass(files, step, ["upload", "download"]);
}

function updateFileList() {
  var fileList = document.getElementById("FileList");
  fileList.innerHTML = "";
  uploadFiles.forEach(function(uploadFile, i) {
    filelistItem = document.createElement("button");
    filelistItem.innerText = uploadFile.name;
    filelistItem.addEventListener("click", function() {
      uploadFiles.splice(i, 1);
      updateFileList();
    }, false);
    fileList.appendChild(filelistItem);
  });
  showWizard(uploadFiles.length > 0 ? "upload" : null);
}

function updateProgressBar(loaded, total) {
  var percent = loaded/total * 100;
  document.getElementById("ProgressBar").value = percent;
  document.getElementById("ProgressLabel").firstChild.innerHTML = percent.toFixed(2);
}

// ZIP

// CRC functions based on https://stackoverflow.com/a/18639999 

function makeCRCTable(){
  var c;
  var table = new Uint32Array(256);
  for(var n = 0; n < table.length; n++) {
    c = n;
    for(var k = 0; k < 8; k++) {
      c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  return table;
}

function generateCRC32(arr, table) {
  var crc = 0 ^ (-1);
  for (var i = 0; i < arr.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ arr[i]) & 0xFF];
  }
  return crc ^ (-1) >>> 0;
};

function generateMSTime(timestamp) {
  var date = new Date(timestamp);
  return ((date.getHours()) << 11) + ((date.getMinutes()) << 5) + ((date.getSeconds()/2) << 0);
}

function generateMSDate(timestamp) {
  var date = new Date(timestamp);
  return ((date.getFullYear() - 1980) << 9) + ((date.getMonth() + 1) << 5) + (date.getDate() << 0);
}

function fromLittleEndian(arr) {
  var value = 0;
  for (var i = arr.length -1; i >= 0; i--) {
    value = value << 8;
    value += arr[i];
  }
  return value;
}

function toLittleEndian(num) {
  return new Uint8Array([
    num & 0x000000FF,
    (num >>> 8) & 0x000000FF,
    (num >>> 16) & 0x000000FF,
    (num >>> 24) & 0x000000FF,
  ]);
}

async function createZip() {
  var crcTable = makeCRCTable();
  
  var zip = {
    lfh: new Array(),
    lfhSize: 0,
    data: new Array(),
    dataSize: 0,
    dd: new Array(),
    ddSize: 0,
    cdfh: new Array(),
    cdfhSize: 0,
    oecd: null,
    oecdSize: 0
  };

  for (var i = 0; i < uploadFiles.length; i++) {
    var o = toLittleEndian(zip.lfhSize + zip.dataSize + zip.ddSize);
    var n = new TextEncoder("utf-8").encode(uploadFiles[i].name);
    var l = toLittleEndian(n.length);
    var t = toLittleEndian(generateMSTime(uploadFiles[i].lastModified));
    var d = toLittleEndian(generateMSDate(uploadFiles[i].lastModified));

    var lfh = new Uint8Array(30 + n.length);
    lfh.set(new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, // signature
      0x14, 0x00,             // min version (2.0)
      0x08, 0x00,             // general purpose flags (data descriptor)
      0x00, 0x00,             // compression (none)
      t[0], t[1],             // modified time
      d[0], d[1],             // modified date
      0x00, 0x00, 0x00, 0x00, // CRC checksum (see dd)
      0x00, 0x00, 0x00, 0x00, // compressed size (see dd)
      0x00, 0x00, 0x00, 0x00, // uncompressed size (see dd)
      l[0], l[1],             // file name length
      0x00, 0x00,             // extras length
    ]), 0);
    lfh.set(n, 30);
    zip.lfh.push(lfh);
    zip.lfhSize += lfh.length;

    var data = new Uint8Array(await uploadFiles[i].arrayBuffer());
    zip.data.push(data)
    zip.dataSize += data.length;

    var s = toLittleEndian(uploadFiles[i].size);
    var c = toLittleEndian(generateCRC32(data, crcTable));

    var dd = new Uint8Array([
      0x50, 0x4b, 0x07, 0x08, // signature
      c[0], c[1], c[2], c[3], // CRC checksum 
      s[0], s[1], s[2], s[3], // compressed size
      s[0], s[1], s[2], s[3], // uncompressed size
    ]);
    zip.dd.push(dd);
    zip.ddSize += dd.length;
  
    var cdfh = new Uint8Array(46 + n.length);
    cdfh.set(new Uint8Array([
      0x50, 0x4b, 0x01, 0x02, // signature
      0x14, // created with version (2.0)
      0x00, // created on system (FAT)
      0x14, 0x00, // min version (2.0)
      0x08, 0x00, // general purpose flags (data descriptor)
      0x00, 0x00, // compression (none)
      t[0], t[1], // modified time
      d[0], d[1], // modified date
      c[0], c[1], c[2], c[3], // CRC checksum
      s[0], s[1], s[2], s[3], // compressed size
      s[0], s[1], s[2], s[3], // uncompressed size
      l[0], l[1], // file name length
      0x00, 0x00, // extras length
      0x00, 0x00, // comment length
      0x00, 0x00, // start disk
      0x00, 0x00, // internal attributes
      0x00, 0x00, 0x00, 0x00, // external attributes
      o[0], o[1], o[2], o[3], // local header offset
    ]), 0);
    cdfh.set(n, 46);
    zip.cdfh.push(cdfh);
    zip.cdfhSize += cdfh.length;
  }

  var o = toLittleEndian(zip.lfhSize + zip.dataSize + zip.ddSize);
  var s = toLittleEndian(zip.cdfhSize);
  var e = toLittleEndian(zip.cdfh.length);

  zip.oecd = new Uint8Array([
    0x50, 0x4B, 0x05, 0x06, // signature
    0x00, 0x00,             // disk number
    0x00, 0x00,             // disk with cd entries
    e[0], e[1],             // disk file entries
    e[0], e[1],             // total file entries
    s[0], s[1], s[2], s[3], // CD size
    o[0], o[1], o[2], o[3], // CD offset
    0x00, 0x00              // comment length
  ]);
  zip.oecdSize = zip.oecd.length;
 
  bytes = new Uint8Array(zip.lfhSize + zip.dataSize + zip.ddSize + zip.cdfhSize + zip.oecdSize);
  offset = 0;
 
  for (var i = 0; i < zip.data.length; i++) {
    bytes.set(zip.lfh[i], offset);
    offset += zip.lfh[i].length;
    bytes.set(zip.data[i], offset);
    offset += zip.data[i].length;
    bytes.set(zip.dd[i], offset);
    offset += zip.dd[i].length;
  }

  for (var i = 0; i < zip.data.length; i++) {
    bytes.set(zip.cdfh[i], offset);
    offset += zip.cdfh[i].length;
  }
  
  bytes.set(zip.oecd, offset);
  offset += zip.oecd.length;

  return new Blob([bytes]);
}

async function createNamedBlob() {
  var n = new TextEncoder("utf-8").encode(uploadFiles[0].name);
  var l = toLittleEndian(n.length);
  var hdr = new Uint8Array(6 + n.length);
  hdr.set(new Uint8Array([
      0xFF, 0xFF, 0xFF, 0xFF, // signature
      l[0], l[1]              // file name length
  ]), 0);
  hdr.set(n, 6);
  var data = new Uint8Array(await uploadFiles[0].arrayBuffer());
  
  var bytes = new Uint8Array(hdr.length + data.length);
  bytes.set(hdr, 0);
  bytes.set(data, hdr.length);
  
  return new Blob([bytes]);
}

async function isNamedBlob(blob) {
  var s = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  console.log(s);
  return s[0] == 0xFF && s[1] == 0xFF && s[2] == 0xFF && s[3] == 0xFF;
}

async function sliceNamedBlob(blob) {
  var l = fromLittleEndian(new Uint8Array(await blob.slice(4, 6).arrayBuffer()));
  var n = new TextDecoder("utf-8").decode(new Uint8Array(await blob.slice(6, 6+l).arrayBuffer()));
  return {
    name: n,
    data: blob.slice(6+l)
  };
}

// network

function downloadBlob(id) {
  return new Promise(function(resolve, reject) {
    var req = new XMLHttpRequest();
    req.open("GET", "/files/" + id.substr(1), true);
    req.responseType = "blob";
    req.addEventListener("progress", function(evt) {
      updateProgressBar(evt.loaded, evt.total);
    }, false);
    req.addEventListener("load", function() {
      resolve(req.response);
    }, false);
    req.addEventListener("abort", function(evt) {
      reject(new Error("XMLHttpRequest abort"));
    }, false);
    req.addEventListener("error", function(evt) {
      reject(new Error("XMLHttpRequest error"));
    }, false);
    req.addEventListener("timeout", function(evt) {
      reject(new Error("XMLHttpRequest timeout"));
    }, false);
    req.send(null);
  });
}

function uploadBlob(blob) {
  return new Promise(function(resolve, reject) {
    var req = new XMLHttpRequest();
    req.open("POST", "/files/", true);
    req.responseType = "text";
    req.upload.addEventListener("progress", function(evt) {
      updateProgressBar(evt.loaded, evt.total);
    }, false);
    req.addEventListener("load", function() {
      resolve(req.response);
    }, false);
    req.addEventListener("abort", function(evt) {
      reject(new Error("XMLHttpRequest abort"));
    }, false);
    req.addEventListener("error", function(evt) {
      reject(new Error("XMLHttpRequest error"));
    }, false);
    req.addEventListener("timeout", function(evt) {
      reject(new Error("XMLHttpRequest timeout"));
    }, false);
    req.send(blob);
  });
}

// events

function onDragOver(evt) {
  evt.preventDefault();
}

function onDrop(evt) {
  evt.preventDefault();
  for (var i = 0; i < evt.dataTransfer.items.length; i++) {
    if (evt.dataTransfer.items[i].kind === 'file')
      uploadFiles.push(evt.dataTransfer.items[i].getAsFile());
    else
      console.warn("dropped item[" + i + "] of kind '" + evt.dataTransfer.items[i].kind  + "' ignored");
  }
  updateFileList();
}

function onAddChange(evt) {
  evt.preventDefault();
  for (var i = 0; i < evt.target.files.length; i++) {
    uploadFiles.push(evt.target.files[i]);
  }
  updateFileList();
}

async function onUploadClick() {
  try{
    var blob = null;
    var uploadButton = document.getElementById("UploadButton");
    showWizard("progress");
    updateProgressBar(0, 100);
    disableFiles();
    if (uploadFiles.length > 1)
      blob = await createZip()
    else
      blob = await createNamedBlob();
    var id =  await uploadBlob(blob)
    var href = location.href.slice(0, -1) + "#" + id;
    document.getElementById("DownloadLink").innerText = href;
    document.getElementById("CopyButton").addEventListener("click", function() {
      copyToClipboard(href);
    }, false);
    document.getElementById("MailButton").addEventListener("click", function() {
      sendAsMail(href);
    }, false);
    showWizard("finish");
  }
  catch(error) {
    console.error(error);
    alert("Something went wrong while uploading the files.");
    location.href = "/";
  }
}

function onLoad() {
  var dropNode = document.getElementById("HeaderSnippet");
  dropNode.addEventListener("dragover", onDragOver, false);
  dropNode.addEventListener("drop", onDrop, false);
  document.getElementById("AddInput").addEventListener("change", onAddChange, false);
  document.getElementById("UploadButton").addEventListener("click", onUploadClick, false);
  onHashChange();
}

async function onHashChange() {
  if (location.hash) {
    try {
      showFiles("download");
      showWizard("progress");
      updateProgressBar(0, 100);
      var blob = await downloadBlob(location.hash);
      if (await isNamedBlob(blob)) {
        var namedBlob  = await sliceNamedBlob(blob);
        saveAs(namedBlob.data, namedBlob.name);
      }
      else {
        saveAs(blob, "sharetastic.zip");
      }
      location.href = "/";
    }
    catch(error) {
      console.error(error);
      alert("Something went wrong while downloading the files.");
      location.href = "/";
    }
  }
  else {
    showFiles("upload");
  }
}

window.addEventListener("load", onLoad, false);
window.addEventListener("hashchange", onHashChange, false);
