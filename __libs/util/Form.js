/**
 * Created by rickmatias on 20/05/20.
 */
Util.getFormResponseAsObject = function(formResponse){
  let itemResponses = formResponse.getItemResponses();
  let formResponseObj = {};
  for (let j = 0; j < itemResponses.length; j++) {
    let itemResponse = itemResponses[j];
    let item = itemResponse.getItem();
    let itemTitle = item.getTitle();
    let gridItem;

    try{
      try{
        gridItem = item.asGridItem();
      }catch(e){
        gridItem = item.asCheckboxGridItem()
      }

      //Se for GridItem ou CheckboxGridItem, cai aqui
      let rows = gridItem.getRows();

      let responses = itemResponse.getResponse();

      formResponseObj[itemTitle] = rows.reduce((obj, curr, index) => {
        obj[curr] = responses[index];
        return obj;
      }, {});

    //Se não for GridItem ou CheckboxGridItem, cai aqui
    }catch(e){
      formResponseObj[itemTitle] = itemResponse.getResponse();
    }
  }
  const respondentEmail = formResponse.getRespondentEmail().toLowerCase().trim();

  if(respondentEmail){
    formResponseObj["Email"] = respondentEmail;
  }

  formResponseObj["Respondido em"] = formResponse.getTimestamp();
  formResponseObj["id"] = formResponse.getId();
  formResponseObj["url"] = formResponse.getEditResponseUrl();

  return formResponseObj;
}

Util.getCompleteFormResponseAsObject = function(form, formResponse){
  function getFormInitialResponseAsObject(form){
    function getInitialValueByItem(item){
      var type = '' + item.getType();

      switch (type) {
        case 'CHECKBOX':         return [];
        case 'TEXT':             return '';
        case 'TIME':             return null;
        case 'DATE':             return null;
        case 'DATETIME':         return null;
        case 'DURATION':         return '';
        case 'LIST':             return '';
        case 'MULTIPLE_CHOICE':  return '';
        case 'PARAGRAPH_TEXT':   return '';
        case 'SCALE':            return '0';

        case 'CHECKBOX_GRID':
          item = item.asCheckboxGridItem();

          return item.getRows().reduce((obj, row) => {
            obj[row] = [];

            return obj;
          }, {});

        case 'GRID':
          item = item.asGridItem();

          return item.getRows().reduce((obj, row) => {
            obj[row] = '';

            return obj;
          }, {});

        default:
          return false;
      }
    }

    let items = form.getItems();

    return items.reduce((obj, item) => {
      let initialValue = getInitialValueByItem(item);

      if(initialValue !== false){
        obj[item.getTitle()] = initialValue;
      }
      return obj;
    }, {});
  }

  let formResponseObj = getFormInitialResponseAsObject(form);

  let itemResponses = formResponse.getItemResponses();

  for (let j = 0; j < itemResponses.length; j++) {
    let itemResponse = itemResponses[j];
    let item = itemResponse.getItem();
    let itemTitle = item.getTitle();
    let gridItem;

    try{
      try{
        gridItem = item.asGridItem();
      }catch(e){
        gridItem = item.asCheckboxGridItem()
      }

      //Se for GridItem ou CheckboxGridItem, cai aqui
      let rows = gridItem.getRows();

      let responses = itemResponse.getResponse();

      formResponseObj[itemTitle] = rows.reduce((obj, curr, index) => {
        obj[curr] = responses[index];
        return obj;
      }, {...formResponseObj[itemTitle]});

    //Se não for GridItem ou CheckboxGridItem, cai aqui
    }catch(e){
      formResponseObj[itemTitle] = itemResponse.getResponse();
    }
  }
  const respondentEmail = formResponse.getRespondentEmail().toLowerCase().trim();

  if(respondentEmail){
    formResponseObj["Email"] = respondentEmail;
  }

  formResponseObj["respondido em"] = formResponse.getTimestamp();
  formResponseObj["id"] = formResponse.getId();
  formResponseObj["url"] = formResponse.getEditResponseUrl();
  formResponseObj["form id"] = form.getId();
  formResponseObj["form title"] = form.getTitle()

  return formResponseObj;
}

Util.minifyKey = function(key, toLowerCase=true){
  let newKey = '';

  //Checa se key termina com parêntesis
  const match1 = key.match(/\(([^\)]{4,})\)$/i);

  //Checa se key tem palavras-chaves (MAIÚSCULAS)
  const match2 = key.match(/[A-ZÁÂÃÉÊÍÓÔÕÚÇ\s\-\/]{3,}/);

  if(match1){
    newKey = match1[1];
  }else if (match2){
    newKey = match2[0].trim();
  }else if(!key.match(/[\?\:]$/i)){
    newKey = key;
  }

  return toLowerCase ? newKey.toLowerCase() : newKey;
}

Util.minifyResponseObjectKeys = function(obj){
  return Object.keys(obj)
    .reduce((newObj, key) => {
      let newKey = Util.minifyKey(key, true);

      if(newKey){
        let value = obj[key];

        if (Util.whatIsIt(value) === "Object") {
          value = Util.minifyResponseObjectKeys(value);
        }

        newObj[newKey] = value;
      }
      return newObj;
    }, {});
}

Util.getItemByText = function(form, title, arrOfallowedItemTypes=null){
  const items = form.getItems();

  if(arrOfallowedItemTypes)
    arrOfallowedItemTypes = arrOfallowedItemTypes.map(itemType => '' + itemType);

  for(let i=0; i < items.length; i++){
    let item = items[i];
    let foundTitle = item.getTitle();
    if(
      (!arrOfallowedItemTypes || arrOfallowedItemTypes.includes(('' + item.getType()))) &&
      (foundTitle.match(title) || foundTitle == title)
    ){
      return items[i];
    }
  }

  throw 'Não foi encontrado nenhum item como o título "' + title + '".';
}

Util.createFormResponse = function(form){
  let formId = form.getId();
  const isAcceptingResponses = form.isAcceptingResponses();

  Util.submitFormProgramatically.isAcceptingResponses[formId] = isAcceptingResponses;

  form.setAcceptingResponses(true);
  return form.createResponse();
}

Util.insertMultipleItemResponseOnFormResponse = function(form, formResponse, arrOfObjects){
  arrOfObjects.map(obj => {
    const item = Util.getItemByText(form, obj.title, [obj.itemType]);
    const value = obj.value || "";;
    formResponse = Util.insertItemResponseOnFormResponse(
      formResponse,
      item,
      value
    );
  });
  return formResponse;
}

Util.insertItemResponseOnFormResponse = function(formResponse, item, response){
  let itemResponse = Util.getItemAs(item);
  let itemType = '' + item.getType();

  switch (itemType) {
    case 'DATE':
    case 'DATETIME': {
      if (Util.whatIsIt(response) == "String") {
        response = Util.getDateFromString(response);
      }
      formResponse.withItemResponse(itemResponse.createResponse(response));
      break;
    }
    case 'DURATION':
    case 'TIME':
    {
      if (Util.whatIsIt(response) == "String") {
        let matches = response.match(/^([\d]{2}):([\d]{2})(:([\d]{2}))?/);
        if (matches) {
          response = [parseInt(matches[1]), parseInt(matches[2])];

          if (matches[4]) response.push(parseInt(matches[4]));

          formResponse.withItemResponse(
            itemResponse.createResponse(...response)
          );
        }
      }
      break;
    }
    default: {
      formResponse.withItemResponse(itemResponse.createResponse(response));
    }
  }
  return formResponse;
}

Util.getItemAs = function(item){
  var type = '' + item.getType();

  switch (type) {
    case 'CHECKBOX':         return item.asCheckboxItem();
    case 'CHECKBOX_GRID':    return item.asCheckboxGridItem();
    case 'DATE':             return item.asDateItem();
    case 'DATETIME':         return item.asDateTimeItem();
    case 'DURATION':         return item.asDurationItem();
    case 'GRID':             return item.asGridItem();
    case 'IMAGE':            return item.asImageItem();
    case 'LIST':             return item.asListItem();
    case 'MULTIPLE_CHOICE':  return item.asMultipleChoiceItem();
    case 'PAGE_BREAK':       return item.asPageBreakItem();
    case 'PARAGRAPH_TEXT':   return item.asParagraphTextItem();
    case 'SCALE':            return item.asScaleItem();
    case 'SECTION_HEADER':   return item.asSectionHeaderItem();
    case 'TEXT':             return item.asTextItem();
    case 'TIME':             return item.asTimeItem();
    case 'VIDEO':            return item.asVideoItem();
    default:                 return false;
  }
}

Util.submitFormProgramatically = function(form, formResponse){
  const formId = form.getId();
  const isCollectingEmail = form.collectsEmail();

  //Desativa a coleta de emails temporariamente
  form.setCollectEmail(false);

  let arrOfRequiredItems = Util.releaseRequiredQuestions(form);
  let error;
  try{
    formResponse = formResponse.submit();
  }catch(e){
    error = e;
  }finally{
    let isAcceptingResponses =
      Util.submitFormProgramatically.isAcceptingResponses[formId];
    if(isAcceptingResponses === undefined){
      isAcceptingResponses = true;
    }
    form.setAcceptingResponses(isAcceptingResponses);
    form.setCollectEmail(isCollectingEmail);
    Util.releaseRequiredQuestions(arrOfRequiredItems);
  }

  if(error)
    throw error;

  return formResponse;
}
Util.submitFormProgramatically.isAcceptingResponses = {};

Util.releaseRequiredQuestions = function(form){
  let formItems = form.getItems();

  let arrOfRequiredItems = [];

  for (let i=0; i<formItems.length; i++){
    let question = Util.getItemAs(formItems[i]);
    if (question && question.isRequired && question.isRequired()){
      question.setRequired(false);
      arrOfRequiredItems.push(question);
    }
  }

  return arrOfRequiredItems;
}

Util.releaseRequiredQuestions = function(arrOfRequiredItems){
  //restore required questions
  for (let i=0; i < arrOfRequiredItems.length; i++){
    arrOfRequiredItems[i].setRequired(true);
  }
}

Util.copyResponsesFromFormAToFormB = function(formResponseA, formResponseB, formB){
  const formBReferenceObj = formB.getItems().reduce((obj, item) => {
    const key = Util.minifyKey(item.getTitle());
    obj[key] = item;

    return obj;
  }, {});

  let formResponseARefObj = formResponseA.getItemResponses()
    .reduce((obj, itemResponse) => {
      const item = itemResponse.getItem();
      const itemType = item.getType() + '';
      const itemTitle = Util.minifyKey(item.getTitle());
      const response = itemResponse.getResponse();
      obj[itemTitle] = {response, itemType};
      return obj;
    }, {});


  Object.keys(formResponseARefObj).map(key => {
    const itemB = formBReferenceObj[key];

    if(itemB){
      const itemTypeB = itemB.getType() + '';

      let {response: responseA, itemType: itemTypeA} = formResponseARefObj[key];

      if(itemTypeA == 'PARAGRAPH_TEXT' && itemTypeB == 'CHECKBOX'){
        responseA = responseA.split(/\s*\n\s*/);
      }else if(itemTypeA == 'CHECKBOX' && itemTypeB == 'PARAGRAPH_TEXT'){
        responseA = responseA.join('\n');
      }

      formResponseB = Util.insertItemResponseOnFormResponse(formResponseB, itemB, responseA);
    }
  });

  return formResponseB;
}

Util.formatGoogleFormLink = function(link, subfolder=''){
  subfolder = subfolder ? subfolder : 'forms';
  return link.replace(/https:\/\/forms\.gle/, ('clinicaunivitta.com.br/' + subfolder));
}

Util.inactivateForm = function(formId, messageToShow='Esse formulário não está recebendo respostas no momento'){
  const form = FormApp.openById(formId);
  form.setAcceptingResponses(false);
  form.setCustomClosedFormMessage(messageToShow);
}
