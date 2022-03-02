//Dependências:
//Date.js

/*
* @param {Trigger[]} triggers O array com todos os 'triggers' instaláveis associado ao projeto atual
* @param {string} functionName O nome da função que está associada ao 'trigger'
* */
Util.triggerExist = function(functionName){
  const scriptTriggers = ScriptApp.getProjectTriggers();

  for(let i=0; i < scriptTriggers.length; i++){
    if(functionName == scriptTriggers[i].getHandlerFunction()) return true;
  }
  return false;
}

Util.createTimeBasedTrigger = function(intervalValue, triggerFunctionName, intervalType="minutes", isRecurrent=true, execDate=new Date()){
  if(!Util.triggerExist(triggerFunctionName)){
    let clockTriggerBuilder = ScriptApp.newTrigger(triggerFunctionName)
      .timeBased();

    if(isRecurrent){
      switch(intervalType){
        case "minutes":
          clockTriggerBuilder = clockTriggerBuilder.everyMinutes(intervalValue);
          break;
        case "hours":
          clockTriggerBuilder = clockTriggerBuilder.everyHours(intervalValue);
          break;
        case "days":
          clockTriggerBuilder = clockTriggerBuilder.everyDays(intervalValue);
          break;
        case "weeks":
          clockTriggerBuilder = clockTriggerBuilder.everyWeeks(intervalValue);
          break;
      }
    }else{
      if(Util.isValidDate(execDate)){
        clockTriggerBuilder = clockTriggerBuilder.at(execDate);
      }else{
        let interval;

        switch (intervalType){
          case "days":
              interval = intervalValue * 24 * 60 * 60 * 1000;
            break;
          case "minutes":
              interval = intervalValue * 60 * 1000;
            break;
        }

        interval = interval || 1000;
        clockTriggerBuilder.after(interval);
      }
    }
    clockTriggerBuilder.create();
  }
}

Util.deleteAllTriggers = function(){
  const scriptTriggers = ScriptApp.getProjectTriggers();
  for(let i = 0; i < scriptTriggers.length; i++){
    ScriptApp.deleteTrigger(scriptTriggers[i]);
  }
}

Util.deleteTrigger = function (triggerFunction) {
  const scriptTriggers = ScriptApp.getProjectTriggers();

  for (let i = 0; i < scriptTriggers.length; i++) {
    let trigger = scriptTriggers[i];
    if (trigger.getHandlerFunction() == triggerFunction) {
      ScriptApp.deleteTrigger(trigger);
    }
  }
};

/**
 *
 * @param {Date} startExec Data de início da execução da função
 * @param {Boolean} wait Se true, aguardaremos propositalmente 1 minuto, antes de
 *   retornar a resposta
 * @param {Number} [safeMargin] Tempo (em minutos) para considerarmos como
 * margem de segurança comparado a EXECUTION_TIME_OUT
 * @returns
 */
Util.isFunctionAboutToTimeout = function(startExec, wait=false, safeMargin=2){
  if(wait)
    Utilities.sleep(60000);

  return Util.getTimeSinceDate(startExec) >= EXECUTION_TIME_OUT - safeMargin;
}

Util.log = function (...params) {
  if (SHOW_LOGS) Logger.log(...params);
};

Util.getStack = function (msg) {
  var stack = "";

  try {
    throw new Error(msg);
  } catch (e) {
    stack = e.stack;
  }

  return stack;
};