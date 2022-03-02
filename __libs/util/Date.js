//Dependências:
//Vars.js
//String.js
Util.getDateFormated = function(date, format){
  if(!Util.isEmpty(date)){
    if(!Util.whatIsIt(date) === "Date"){

    }
    return format
      .replace("ddd",  Util.getWeekDay(date))
      .replace("dd",   Util.pad(date.getDate(), 2))
      .replace("mmm",  Util.getMonthName(date.getMonth()))
      .replace("mm",   Util.pad(date.getMonth()+1, 2))
      .replace("yyyy", date.getFullYear())
      .replace("yy",   date.getYear())
      .replace("hh",   Util.pad(date.getHours(), 2))
      .replace("ii",   Util.pad(date.getMinutes(),2))
      .replace("ss",   Util.pad(date.getSeconds(),2));
  }
  return "";
}

Util.getWeekDay = function(date){
  var d = date.getDay();
  switch(d){
    case 0:
      return "domingo";
    case 1:
      return "segunda-feira";
     case 2:
      return "terça-feira";
     case 3:
      return "quarta-feira";
     case 4:
      return "quinta-feira";
     case 5:
      return "sexta-feira";
     case 6:
      return "sábado";
  }
}

Util.getMonthName = function(m){
  const arrayOfMonthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];
  return arrayOfMonthNames[m];
}

Util.sumDate = function(date, interval){
  var newDate = new Date (date.getTime());
  var match1 = interval.match(/(\-?[\d]+)h/);
  var match2 = interval.match(/(\-?[\d]+)d/);
  var match3 = interval.match(/(\-?[\d]+)m/);
  var match4 = interval.match(/(\-?[\d]+)[ay]/);

  if(match1){
    var h = parseInt(match1[1]);
    newDate.setHours(newDate.getHours() + h);
  }
  if(match2){
    var d = parseInt(match2[1]);
    newDate.setDate(newDate.getDate() + d);
  }
  if(match3){
    var m = parseInt(match3[1]);
    newDate.setMonth(newDate.getMonth() + m);
  }
  if(match4){
    var y = parseInt(match4[1]);
    newDate.setYear(newDate.getFullYear() + y);
  }

  return newDate;
}

Util.getDateFromString = function(d){
  d = d + "";
  try{
    //Se data corresponde ao formato dd/mm/aaaa (hh:mm:ss) ou dd-mm-aaaa (hh:mm:ss)
    var match1 = d.match(/([\d]{2})[\/\-]([\d]{2})[\/\-]([\d]{4})/);
    //Se data corresponde ao formato dd/mm/aaaa (hh:mm:ss) ou aaaa-mm-dd (hh:mm:ss)
    var match2 = d.match(/([\d]{4})[\/\-]([\d]{2})[\/\-]([\d]{2})/);
    var match3 = d.match(/([\d]{2})\:([\d]{2})[\:]?([\d]{2})?$/);

    let date,day, month,year;
    let hour = 0, minutes = 0, seconds = 0;

    if (match1) {
      day = parseInt(match1[1], 10);
      month = parseInt(match1[2], 10) - 1;
      year = parseInt(match1[3], 10);
    } else if (match2) {
      day = parseInt(match2[3], 10);
      month = parseInt(match2[2], 10) - 1;
      year = parseInt(match2[1], 10);
    }
    //Se tem hh:mm:ss
    if (match3) {
      hour = parseInt(match3[1], 10);
      minutes = parseInt(match3[2], 10);
      if (match3[3]) {
        seconds = parseInt(match3[3], 10);
      }
    }

    date = new Date(year, month, day, hour, minutes, seconds);

    if(Util.isValidDate(date) && date.getDate() == day){
      return date;
    }else{
      throw `Data inválida!`
    }
  }catch(e){
    throw `Erro ao chamar 'Util.getDateFromString'. Não foi possível transformar a string '${d}' numa data válida!`;
  }
};

Util.isValidDate = function (date) {
  try {
    return date.getTime() == date.getTime();
  } catch (e) {
    return false;
  }
};

Util.isSameDate = function(dateA, dateB){
  try{
    dateA = new Date(dateA);
    dateB = new Date(dateB);

    if(Util.isValidDate(dateA) && Util.isValidDate(dateB)){
      return (
      dateA.getDate()==dateB.getDate() &&
      dateA.getMonth() == dateB.getMonth() &&
      dateA.getFullYear()==dateB.getFullYear());
    }
    return false;
  }catch(e){
    return false;
  }
}

Util.getTimeSinceDate = function (initialDate, unit = "minutes") {
  let duration = (new Date().getTime() - initialDate.getTime()) / 1000;
  switch (unit) {
    case "minutes":
      return duration / 60;
    case "seconds":
      return duration;
    case "hours":
      return duration / 3600;
  }
};