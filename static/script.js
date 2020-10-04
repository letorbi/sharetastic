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

function showWizard(stepClass) {
  var wizard = document.getElementById("Wizard");
  wizard.classList.remove("upload");
  wizard.classList.remove("progress");
  wizard.classList.remove("finish");
  if (stepClass)
    wizard.classList.add(stepClass);
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

// network

async function uploadBlob(blob) {
  response =  await fetch("/files/", {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: blob
  });
  return await response.text();
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

function onUploadClick() {
  var uploadButton = document.getElementById("UploadButton");
  showWizard("progress");
  createZip().then(function(zip) {
    uploadBlob(zip).then(function(id) {
      var href = location.href.slice(0, -1) + "#" + id;
      document.getElementById("DownloadLink").innerText = href;
      document.getElementById("CopyButton").addEventListener("click", function() {
        copyToClipboard(href);
      }, false);
      document.getElementById("MailButton").addEventListener("click", function() {
        sendAsMail(href);
      }, false);
      showWizard("finish");
    });
  }, function(error) {
    console.error(error);
    alert("Something went wrong while uploading the files.");
    showWizard("upload");
  });
}

function onLoad() {
  var dropNode = document.getElementById("HeaderSnippet");
  dropNode.addEventListener("dragover", onDragOver, false);
  dropNode.addEventListener("drop", onDrop, false);
  document.getElementById("AddInput").addEventListener("change", onAddChange, false);
  document.getElementById("UploadButton").addEventListener("click", onUploadClick, false);
}

window.addEventListener("load", onLoad, false);
