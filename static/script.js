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
  console.log("TODO upload files");
}

function onLoad() {
  var dropNode = document.getElementById("HeaderSnippet");
  dropNode.addEventListener("dragover", onDragOver, false);
  dropNode.addEventListener("drop", onDrop, false);
  document.getElementById("AddInput").addEventListener("change", onAddChange, false);
  document.getElementById("UploadButton").addEventListener("click", onUploadClick, false);
}

window.addEventListener("load", onLoad, false);
