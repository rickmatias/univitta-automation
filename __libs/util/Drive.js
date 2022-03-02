Util.getFileDownloadLink = function(fileId){
  let match;
  if(match = fileId.match(/.*[^-\w]([-\w]{25,})[^-\w]?.*/)){
    fileId = match[1];
  }
  return `https://docs.google.com/uc?id=${fileId}`;
}

Util.getFileViewLink = function(fileId){
  return `https://drive.google.com/file/d/${fileId}/view`;
}