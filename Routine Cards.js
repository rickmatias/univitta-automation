/**
 * Esta função é executada recorrentemente (de uma em uma hora) e cria cartões em diversos quadros
 * nos quais o bot "@univittabot" tem acesso, os quais representam as rotinas dos diversos
 * líderes e funcionários da Univitta
 */
function createRoutineTasks(){
  const sheetRoutines = Util.fastGetSheetBySpreadsheetIdAndSheetName(TASKS_SS_ID, ROUTINES_TAB_NAME);
  const today = Trellinator.now();
  today.setMinutes(0);
  const hour = today.stringFormat('HH:MM');

  today.setMinutes(0);

  const weekDayPTmin = Util.getWeekDay(today).substr(0,3);
  const todayStr = today.toLocaleString('pt-BR', {dateStyle: 'short'}).replace(/\/[\d]{4}$/, '');
  const patternDay = new RegExp('(^|;)' + (today.getDate() + '').padStart(2, '0') + '($|;)');
  const hollidays = getHolidays_();

  const condition = r => {
    return (
      r['Ativo?']                         &&
      r['Horários']                       &&
      r['Horários'].match(hour)           &&
      (
        r['Feriados']                     ||
        !hollidays.includes(todayStr)
      )                                   &&
      r['Dias']                           &&  
      (
        r['Dias'].match(weekDayPTmin)     ||
        r['Dias'].match(todayStr)         ||
        r['Dias'].match(patternDay)
      )
    );
  }

  const eRows = EloquentRow.getEloquentRowsByCondition(sheetRoutines, condition);

  eRows.forEach(eRow => {
    try{
      let interval, limitHour, card, checklist, funcToExec, cardIsNew;

      const dueDate = Trellinator.now();
      const cardName = '🔁 ' + eRow.get('Título');

      const description = eRow.get('Descrição') +  '\n\n' +
        'OBS: cartão criado recorrentemente ([ver parâmetros](' + eRow.getUrl() + '))';

      if(interval = eRow.get('Prazo')){
        dueDate.addInterval(interval);
      }

      if((limitHour = eRow.get('Hora Limite')) && limitHour.match(/[\d]{2}\:[\d]{2}/)){
        dueDate.at(limitHour);
      }
      const boardId = eRow.get('Quadro').split("[")[1].replace("]","").trim();
      const board = new Board({id: boardId});
      const list = board.findOrCreateList('Fazer');

      const pattern = new RegExp(cardName.replace(/^[^\s]*[\s]*/, ''), 'i');

      try{
        card = list.card(pattern);
        card.postComment(
          '@card, acredito que esse cartão já deveria ter sido concluído, pois fui ' + 
          'programado para criar um novo cartão com o mesmo título que esse.\n' +
          'OBS: se achar que isso é um erro, por favor, informe a gestão.'
        );
        cardIsNew = false;
      //Se não houver um cartão com mesmo nome, será lançada uma InvalidDataException
      }catch(e){
        card = Card.create(list, {
          name : cardName,
          desc : description,
          due : dueDate
        });

        cardIsNew = true;

        if(checklist = eRow.get('Checklist')){
          let checklistTexts = checklist.match(/\]\(/) ? checklist.split(/(?<=\));(?=\[)/) : [`[Checklist](${checklist})`];

          checklistTexts.forEach(checklistText => {
            const checklistName = checklistText.split(/[\s]*\][\s]*/)[0].replace(/[\s]*\[[\s]*/, '');
            const checkItems = checklistText.split(']')[1].replace(/^[\(\s]/, '').replace(/[\s]*\)[\s]*$/, '').split(/[\s]*;[\s]*/);

            card.addChecklist(checklistName, cl => {
              checkItems.forEach(checkItemText => {
                cl.addItem(checkItemText);
              });
            }, "bottom");
          });
        }
      }

      // Executa função cujo nome está na coluna "Função a executar"
      if(funcToExec = eRow.get("Função a executar")){
        const params = {
          card,
          eRow,
          cardIsNew
        }
        this[funcToExec](params);
      }

      getListOfMembers_(eRow.get('Membros')).each(memberName => {
        card.addMember(new Member({username: memberName}));
      });
    }catch(e){
      console.log(e);
      console.log(e['stack']);
    }
  });
}

/**
 * Esta função recebe uma string contendo nomes de membros no Trello da coluna
 * "Membros" da planilha "Rotinas" e retorna um IterableCollection contendo o nome dos membros
 * @param {string} members
 * @example
 * getListOfMembers_('drricardomatias');            //Retorna um IterableCollection com 'drricardomatias' ()
 * getListOfMembers_('drricardomatias+rosykenia');  //Retorna um IterableCollection com 'drricardomatias' e 'rosykenia'
 * getListOfMembers_('drricardomatias||rosykenia'); //Retorna um IterableCollection com 'drricardomatias' ou 'rosykenia' (único item aleatório)
 * @returns {TrellinatorCore.IterableCollection}
 */
function getListOfMembers_(members){
  if(members.match(/\+/)){
    return new IterableCollection(members.split('+'));
  }else if(members.match(/\|\|/)){
    return new IterableCollection([new IterableCollection(members.split('||')).random()]);
  }
  return new IterableCollection([members]);
}


/**
 * Esta função retorna as datas de feriado
 * @returns {string[]} Um array de strings com as datas dos feriados no formato 'DD/MM'
 */
function getHolidays_(){
  const sheetHolidays = Util.fastGetSheetBySpreadsheetIdAndSheetName(TASKS_SS_ID, HOLIDAYS_TAB_NAME);
  return Util.getRowsAsObjectsByCondiction(sheetHolidays, r => r['Data'])
  .map(rowObject => rowObject['Data']);
}


/**
 * Esta função sincroniza a planilha espelho "Contatos com paciente" (espelho de "Contatos Univitta")
 * e posta um comentário no cartão (passado como membro do objeto "params")
 * Normalmente, esta função é chamada pela função "createRoutineTasks" quando o cartão
 * rotineiro com nome "Contactar pacientes para agendar consultas" é criado
 *
 * @param {object} params
 * @param {TrelloEntities.Card} params.card O cartão onde será postado um comentário com a
 * quantidade de linhas da planilha que foi sincronizada""
 */
function syncSheetMirrorContactWithPatient_(params){
  const {card} = params;
  const rowsUpdated = SheetMirrorContactWithPacient.syncSheetWithMirror();
  card.postComment(`@drricardomatias, acabei de sincronizar ${rowsUpdated} linha(s).`);
}

/**
 * Esta função sincroniza a planilha espelho "Contatos sem Whatsapp" (espelho da planilha "Contatos Univitta")
 * e posta um comentário no cartão (passado como membro do objeto "params")
 * Normalmente, esta função é chamada pela função "createRoutineTasks" quando o cartão
 * rotineiro com nome "Checar números de Whatsapp" é criado
 *
 * @param {object} params
 * @param {TrelloEntities.Card} params.card O cartão onde será postado um comentário com a
 * quantidade de linhas da planilha que foi sincronizada""
 */
 function syncSheetMirrorNoWhatsapp_(params){
  const {card} = params;
  const rowsUpdated = SheetMirrorNoWhatsapp.syncSheetWithMirror();
  card.postComment(`@drricardomatias, acabei de sincronizar ${rowsUpdated} linha(s).`);
}