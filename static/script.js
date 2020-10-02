var uploadFiles = new Array();

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
}

function saveAs(object, filename) {
  var link = document.createElement("a");
  link.href = URL.createObjectURL(object);
  link.download = filename;
  link.click();
}

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
  console.log("TODO upload all files");

  var zip = {
    lfh: new Array(),
    data: new Array(),
    dd: new Array(),
    cdfh: new Array(),
    oecd: null
  };
  
  for (var i = 0; i < 1; i++) {
    zip.lfh.push(new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, // signature
      0x14, 0x00,             // min version (2.0)
      0x08, 0x00,             // general purpose flags (TODO)
      0x00, 0x00,             // compression (TODO)
      0x00, 0x00,             // modified time (TODO)
      0x00, 0x00,             // modified date (TODO)
      0x00, 0x00, 0x00, 0x00, // CRC checksum (see dd)
      0x00, 0x00, 0x00, 0x00, // compressed size (see dd)
      0x00, 0x00, 0x00, 0x00, // uncompressed size (see dd)
      0x04, 0x00,             // file name length (TODO)
      0x00, 0x00,             // extras length (TODO)
      0x74, 0x65, 0x73, 0x74,  // file name
      //0x55, 0x54, 0x0d, 0x00, 0x07, 0x51, 0xe1, 0x76, // extras
      //0x5f, 0x51, 0xe1, 0x76, 0x5f, 0x51, 0xe1, 0x76, // extras
      //0x5f, 0x75, 0x78, 0x0b, 0x00, 0x01, 0x04, 0xe8, // extras
      //0x03, 0x00, 0x00, 0x04, 0xe8, 0x03, 0x00, 0x00, // extras
      //0x03, 0x00 // data?
    ]));

    zip.data.push(uploadFiles[i]),

    zip.dd.push(new Uint8Array([
      0x50, 0x4b, 0x07, 0x08, // signature
      0x00, 0x00, 0x00, 0x00, // CRC checksum (TODO) 
      0x00, 0x00, 0x00, 0x00, // compressed size (TODO)
      0x00, 0x00, 0x00, 0x00  // uncompressed size (TODO)
    ]));

    zip.cdfh.push(new Uint8Array([
      0x50, 0x4b, 0x01, 0x02, // signature
      0x14, // created with version (2.0)
      0x03, // created on system (unix)
      0x14, 0x00, // min version (2.0)
      0x08, 0x00, // general purpose flags
      0x00, 0x00, // compression (none)
      0x00, 0x00, // modified time (TODO)
      0x00, 0x00, // modified date (TODO)
      0x00, 0x00, 0x00, 0x00, // CRC checksum (TODO)
      0x00, 0x00, 0x00, 0x00, // compressed size (TODO)
      0x00, 0x00, 0x00, 0x00, // uncompressed size (TODO)
      0x04, 0x00, // file name length (TODO)
      0x00, 0x00, // extras length (TODO)
      0x00, 0x00, // comment length (TODO)
      0x00, 0x00, // start disk (0)
      0x00, 0x00, // internal attributes (TODO)
      0x00, 0x00, 0x00, 0x00, // external attributes (TODO)
      0x00, 0x00, 0x00, 0x00, // local header offset (TODO)
      0x74, 0x65, 0x73, 0x74,  // file name
      //0x55, 0x54, 0x0d, 0x00, 0x07, 0x51, 0xe1, 0x76, // extras
      //0x5f, 0x51, 0xe1, 0x76, 0x5f, 0x51, 0xe1, 0x76, // extras
      //0x5f, 0x75, 0x78, 0x0b, 0x00, 0x01, 0x04, 0xe8, // extras
      //0x03, 0x00, 0x00, 0x04, 0xe8, 0x03, 0x00, 0x00  // extras
    ]));
  }

  zip.oecd = new Uint8Array([
    0x50, 0x4B, 0x05, 0x06, // signature
    0x00, 0x00,             // disk number
    0x00, 0x00,             // disk with cd entries
    0x01, 0x00,             // disk file entries (TODO)
    0x01, 0x00,             // total file entries (TODO)
    0x32, 0x00, 0x00, 0x00, // CD size
    0x32, 0x00, 0x00, 0x00, // CD offset
    0x00, 0x00              // comment length
  ]);
 
  bytes = new Uint8Array(zip.lfh[0].length + zip.dd[0].length + zip.cdfh[0].length + zip.oecd.length);
  bytes.set(zip.lfh[0]);
  bytes.set(zip.dd[0], zip.lfh[0].length);
  bytes.set(zip.cdfh[0], zip.lfh[0].length + zip.dd[0].length);
  bytes.set(zip.oecd, zip.lfh[0].length + zip.dd[0].length + zip.cdfh[0].length);
  var zipfile = new Blob([bytes]);

  saveAs(zipfile, "sharetastic.zip");

  /*const supportsRequestStreams = !new Request('', {
    body: new ReadableStream(),
    method: 'POST',
  }).headers.has('Content-Type');

  console.log(supportsRequestStreams);

  fetch("/files/", {
    method: 'POST',
    body: uploadFiles[0].stream(),
    allowHTTP1ForStreamingUpload: true
  });*/
}

function onLoad() {
  var dropNode = document.getElementById("HeaderSnippet");
  dropNode.addEventListener("dragover", onDragOver, false);
  dropNode.addEventListener("drop", onDrop, false);
  document.getElementById("AddInput").addEventListener("change", onAddChange, false);
  document.getElementById("UploadButton").addEventListener("click", onUploadClick, false);
}

window.addEventListener("load", onLoad, false);
