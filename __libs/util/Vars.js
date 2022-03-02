//Dependências: nenhuma

Util.isEmpty = function(t) {
  return (t == "" || t == null || t == "null");
}

Util.whatIsIt = function(object){
  var stringConstructor = "test".constructor;
  var objectConstructor = ({}).constructor;

  if (object === null) {
    return "null";
  }else if (object === undefined) {
    return "undefined";
  }else if (object.constructor === stringConstructor || object.constructor === String) {
    return "String";
  }else if (Array.isArray(object)){
    return "Array";
  }else if(object && object.getDate && object.getMonth){
    return "Date";
  }else if (object.constructor === objectConstructor || object.constructor === Object) {
    return "Object";
  }
  return 'don\'t know';
}