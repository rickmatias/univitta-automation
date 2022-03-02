//Dependências: nenhuma

Util.pad = function(num, size){
  let s = "000000000" + num;
  return s.substr(s.length-size);
}

Util.getFirstName = function(name){
  return name.replace(/[\s].*$/, "");
}

Util.getFormatedCPF = function(cpf=""){
  cpf = (cpf + "").replace(/\D/g, "").padStart(11, "0");

  if (cpf.length == 11){
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }else{
    throw 'CPF INVÁLIDO';
  }
}

Util.isCPFValid = function(strCPF="") {
  strCPF = Util.getFormatedCPF(strCPF).replace(/\D/g, "");
  let sum;
  let rest;
  sum = 0;
  if (strCPF == "00000000000") return false;

  for (i = 1; i <= 9; i++){
    sum = sum + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
  }
  rest = (sum * 10) % 11;

  if (rest == 10 || rest == 11) rest = 0;
  if (rest != parseInt(strCPF.substring(9, 10))) return false;

  sum = 0;
  for (i = 1; i <= 10; i++){
    sum = sum + parseInt(strCPF.substring(i - 1, i)) * (12 - i);
  }
  rest = (sum * 10) % 11;

  if (rest == 10 || rest == 11) rest = 0;
  if (rest != parseInt(strCPF.substring(10, 11))) return false;
  return true;
}

Util.removeAllAccents = function(str){
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

Util.getPersonNameRightlyCapitalized = function(str){
  if(!str) return "";

  str = str.trim().replace(/[\s]+/g, " ").split(" ");

  for (var i = 0, x = str.length; i < x; i++) {
    str[i] = str[i][0].toUpperCase() + str[i].substr(1);
  }

  return str.join(" ")
    .replace(/ D([eao])(s)? /gi, " d$1$2 ")
    .replace(/ [E] /gi, " e ")
    .replace(/ ([A-DF-Z]) (?=.+)/, " $1. ");
}

/*
* @param {string} zipCode O CEP (com ou sem formatação)
*
* @return {string} O CEP formatado
* @throw Exception
* */
Util.getFormatedZipCode = function(zipCode){
  if(!zipCode) return "";

  zipCode += "";

  let zipCodeCleared = zipCode.replace(/\D/g, "");
  let zipCode_str = "";
  if(zipCodeCleared.length == 8){
    let zipCode_f = zipCodeCleared.substr(0, 5);
    let zipCode_l = zipCodeCleared.substr(5, 3);
    zipCode_str = zipCode_f + "-" + zipCode_l;
    return zipCode_str;
  }else if(zipCodeCleared.length == 0){
    return "";
  }
  return zipCode;
}

Util.lowFirstLetter = function(value){
  //Se a segunda letra for maiúscula, estamos diante de uma sigla (não alterar)
  return  value.charAt(1).match(/A-Z/) ? value : (value.charAt(0).toLowerCase() + value.slice(1));
}

Util.upFirstLetter = function(value){
  return value.charAt(0).toUpperCase() + value.slice(1);
}