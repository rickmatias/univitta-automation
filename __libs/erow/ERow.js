//Dependências:
//util/SpreadsheetApp.js
//util/Array.js
/**
 * @module ERow
 * @classdesc A Classe ERow representa cada linha em uma planilha.
 * Ela otimiza a forma como consultamos e alteramos seus valores.
 * ATENÇÃO! Para funcionar corretamente a primeira linha dessa
 * planilha tem que ser o cabeçalho.
 * @param {String} ssId O ID da spreadsheet
 * @param {Sheet} sheetName O nome da planilha
 * @param {Object} [data] Um Objeto em que cada propriedade representa o
 * nome da coluna da planilha
 * @param {Number} [rowNumber] O número da linha a que a ERow se refere
 */
class ERow {
  constructor(ssId, sheetName, data = {}, rowNumber = null) {
    this.ssId = ssId;
    this.sheetName = sheetName;
    this.data = { ...data };
    this.rowNumber = rowNumber;

    /**
     * Array de funções que serão chamadas toda vez que a ERow for salva
     * (chamando 'ERow.save()'). Estas funções recebem como parâmetro a própria
     * ERow que foi salva. Elas poderão acessar o histórico de
     * alterações da ERow e realizar tarefas de acordo com elas.
     * Métodos relacionados:
     * • ERow.getSavedDataUntilLastSave()
     * • ERow.getWhatHasChangedOnLastSave()
     */
    this.subscribers = [];
    /**
     * Array de objetos que representam mudanças na ERow e que, portanto, já foram
     * atualizadas na planilha (normalmente ao chamar o método 'ERow.save()')
     */
    this.history = this.isNew() ? [{}] : [{ ...data }];
  }

  getSheetName() {
    return this.sheetName;
  }

  getSheet() {
    return Util.fastGetSheet(this.ssId, this.sheetName);
  }

  getSpreadsheetId() {
    return this.ssId;
  }

  getUrl() {
    const r = this.getRowNumber();
    const ssId = this.getSpreadsheetId();
    return `https://docs.google.com/spreadsheets/d/${ssId}/edit#gid=0&range=${r}:${r}`;
  }

  get(key) {
    return this.data[key];
  }

  getRowNumber() {
    return this.rowNumber;
  }

  getData() {
    return { ...this.data };
  }

  isNew() {
    return !this.getRowNumber();
  }

  getSavedData() {
    try{
      return this.history.reduce((obj, data) => {
        return {
          ...obj,
          ...data,
        };
      }, {});
    }catch(e){
      return {};
    }
  }

  getSavedDataUntilLastSave() {
    const lastIndex = this.history.length - 1;

    try {
      return this.history.reduce((obj, data, index) => {
        if (index < lastIndex) {
          return {
            ...obj,
            ...data,
          };
        }
        return obj;
      }, {});
    } catch (e) {
      return {};
    }
  }

  getWhatHasChangedOnLastSave() {
    return [...this.history].reverse()[0];
  }

  getNotSavedChanges() {
    const savedData = this.getSavedData();

    return Object.keys(this.data).reduce((obj, key) => {
      if (this.data[key] !== savedData[key]) obj[key] = this.data[key];

      return obj;
    }, {});
  }

  getChangedKeys() {
    const whatChanged = this.getNotSavedChanges();
    return Object.keys(whatChanged);
  }

  hasChanged(arrOfKeys = null) {
    if (arrOfKeys && Util.whatIsIt(arrOfKeys) == "String") {
      arrOfKeys = [arrOfKeys];
    }

    const changedKeys = this.getChangedKeys();

    if (!changedKeys.length) {
      return false;
    } else if (arrOfKeys) {
      return changedKeys.hasAnyItem(arrOfKeys);
    }
    return true;
  }

  /**
   * Este método "inscreve" uma função (subscriber), a qual é chamada através
   * do método "notifyAll" toda vez que esta ERow é salva (ERow.save())
   * @param {Function} subscriber Uma função que recebe um ERow
   * @returns {ERow}
   */
  subscribe(subscriber) {
    if (subscriber) {
      if (!this.subscribers.find((el) => Object.is(el, subscriber))) {
        this.subscribers.push(subscriber);
      }
    }
    return this;
  }

  /**
   * Notifica todos os subscribers desta ERow,
   * passando para eles esta ERow
   */
  notifyAll() {
    this.subscribers.forEach((subscriber) => {
      subscriber(this);
    });
  }

  /**
   * Atualiza os parâmetros do objeto 'ERow.data'. Cada 'key' representa uma
   * o cabeçalho de uma coluna na planilha.
   * @param {String} key
   * @param {any} value
   * @returns {ERow} Esta ERow (para chamadas encadeadas)
   * @throw {ERowException} Uma exceção será disparada se 'key' for vazio.
   */
  set(key, value) {
    if (!key) {
      throw new ERowException(
        `O método 'set' espera que o parâmetro 'key' não seja vazio.`
      );
    }
    this.data[key] = value;
    return this;
  }

  mirrorERow(mirrorERow) {
    Object.keys(mirrorERow.getData()).forEach((key) => {
      this.set(key, mirrorERow.get(key));
    });
    return this;
  }

  getHeaderIndex() {
    if (!this.headerIndex) {
      this.headerIndex = Util.getHeaderIndexes(this.getSheet());
    }
    return this.headerIndex;
  }

  duplicate() {
    const rowNumber = this.getRowNumber() + 1;

    const data = {
      ...this.data
    };

    this.getSheet().insertRowsAfter(rowNumber - 1, 1);

    const eRow = new ERow(this.getSpreadsheetId(), this.getSheetName(), data, rowNumber);
    ERow.updateSheetERowsMap(eRow, undefined);
    return eRow.save(true);
  }

  del() {
    const oldRowNumber = this.getRowNumber();

    if (oldRowNumber) {
      this.rowNumber = null;
      ERow.updateSheetERowsMap(this, oldRowNumber);
      this.getSheet().deleteRow(oldRowNumber);
    }
  }

  save(updateAllKeys = false) {
    if (this.hasChanged() || updateAllKeys) {
      const indexes = this.getHeaderIndex();
      const sheet = this.getSheet();

      let rowNumber = this.getRowNumber();

      if (!rowNumber) {
        rowNumber = ERow.getNextRowNumberBySheet(sheet);
        this.rowNumber = rowNumber;
        ERow.updateSheetERowsMap(this, undefined);
      }
      const whatHasChanged = this.getNotSavedChanges();

      Object.keys(this.data).forEach((key) => {
        if (indexes[key] !== undefined) {
          let value = whatHasChanged[key];

          if (value === undefined && updateAllKeys) {
            value = this.data[key];
          }

          if (value !== undefined) {
            const colNumber = indexes[key] + 1;
            sheet.getRange(rowNumber, colNumber).setValue(value);
          }
        }
      });

      //Adiciona estado atual no histórico desta ERow
      this.history.push(whatHasChanged);
      this.notifyAll();
    }
    return this;
  }
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {function} [condition] Uma função com a qual testar a ERow
 * ATENÇÃO! Se o parâmetro condition não for passado, todas as ERows
 * daquela planilha serão retornadas
 * @param {String} [param.searchType] O tipo de busca a ser realizada
 *   Se 'findAll', serão retornadas todas as ERows encontradas.
 *   Se 'findNext', será retornada apenas a primeira ERow encontrada.
 * @example
 * const today = new Date();
 * const sheet = Util.fastGetSheet(
 *   "1Wr_tYoprTKjLr9nN4Khq-kQ7rVBfkb35l3PHQoAMgeA",
 *   "Contatos"
 * );
 * const condition = eRow => eRow.get('Atualizado em') && eRow.get('Atualizado em') < today;
 * const contactERows = ERow.getERowsByCondition(sheet, condition);
 */

ERow.getERowsByCondition = function (
  sheet,
  condition = null,
  searchType = "findAll"
) {
  const eRows = Array.from(ERow.getSheetERowsMap(sheet, true).values());

  if (!condition) {
    return eRows;
  } else if (searchType == "findAll") {
    return eRows.filter((eRow) => condition(eRow));
  } else if (searchType == "findNext") {
    return eRows.find((eRow) => condition(eRow));
  }
};

ERow.getObjectFromRowData = function (sheet, rowData) {
  const headerValues = Util.getHeaderRow(sheet);
  return rowData.reduce(
    (obj, col, colIndex) => {
      const columnName = headerValues[colIndex];
      if (columnName) {
        obj[columnName] = col;
      }
      return obj;
    },{});
};

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {int} rowNumber
 */
ERow.getERowByRowNumber = function (sheet, rowNumber) {
  const map = ERow.getSheetERowsMap(sheet, false);
  if (map) {
    return map.get(rowNumber) || undefined;
  } else {
    const { ssId, sheetName } = Util.getSheetInfo(sheet);
    const rowData = sheet.getRange(`${rowNumber}:${rowNumber}`).getValues()[0];
    const data = ERow.getObjectFromRowData(sheet, rowData, rowNumber);
    return new ERow(ssId, sheetName, data, rowNumber);
  }
};

/**
 * Retorna a primeira ERow cuja coluna seja igual ao valor
 * passado como parâmetro.
 * @param {Object} param
 * @param {Sheet} param.sheet A planilha onde será realizada a busca
 * @param {String} columnName A coluna onde buscaremos o valor
 * @param {any} value O valor que buscaremos
 * @returns {ERow|undefined} A ERow encontrada ou undefined.
 * @throws {ERowException} Uma exceção será disparada se não existir nenhuma coluna
 * com cabeçalho correspondente a 'columnName'
 */
ERow.getFirstERowByColumnName = function ({ sheet, columnName, value }) {
  return ERow.getERowsByColumnName({
    sheet,
    columnName,
    value,
    searchType: "findNext",
  });
};

/**
 * Retorna todas as ERows cujo valor da coluna seja igual ao valor
 * passado como parâmetro, de acordo com o tipo da busca.
 * @param {Object} param
 * @param {Sheet} param.sheet A planilha onde será realizada a busca
 * @param {String} param.columnName A coluna onde encontraremos o valor
 * @param {any} param.value O valor que buscaremos
 * @param {String} [param.searchType] O tipo de busca a ser realizada
 *   Se 'findAll', serão retornadas todas as ERows encontradas.
 *   Se 'findNext', será retornada apenas a primeira ERow encontrada.
 * @returns {ERow[]|ERow|undefined} Um ERow ou um array de ERows encontrada(s) ou
 * undefined, caso nenhuma ERow corresponda à pesquisa.
 * @throws {ERowException} Uma exceção será disparada se não existir nenhuma
 * coluna correspondente a 'columnName'
 */
ERow.getERowsByColumnName = function ({
  sheet,
  columnName,
  value,
  searchType = "findAll",
}) {
  const map = ERow.getSheetERowsMap(sheet);
  const { ssId, sheetName } = Util.getSheetInfo(sheet);
  if (map) {
    const condition = (eRow) => eRow.get(columnName) == value;
    return ERow.getERowsByCondition(sheet, condition, searchType);
  } else {
    SpreadsheetApp.flush();
    const columnNumber = Util.getColumnNumberByColumnName(sheet, columnName);
    const range = sheet.getRange(1, columnNumber, sheet.getLastRow(), 1);

    if (searchType == "findAll") {
      const result = range
        .createTextFinder(value)
        .matchEntireCell(true)
        .findAll();
      return result.map((range) => {
        const data = Util.getRowAsObject(range.getRow(), 1, sheet);
        return new ERow(ssId, sheetName, data, range.getRow());
      });
    } else if (searchType == "findNext") {
      const result = range
        .createTextFinder(value)
        .matchEntireCell(true)
        .findNext();

      if (result) {
        const rowNumber = result.getRow();
        const data = Util.getRowAsObject(rowNumber, 1, sheet);
        return new ERow(ssId, sheetName, data, rowNumber);
      }
    }
    return undefined;
  }
};

/**
 * Retorna uma instância de 'Map' onde 'key' é o número da linha e 'value' é
 * cada ERow da planilha enviada.
 * @param {Sheet} sheet A planilha da qual pegaremos o Map de suas respectivas ERows
 * @param {Boolean} createIfNotExists Se 'true', um 'Map' será criado, caso não
 * exista.
 * @returns {Map} Uma instância de 'Map'
 */
ERow.getSheetERowsMap = function (sheet, createIfNotExists = false) {
  if (!(sheet && sheet.getName)) {
    throw new ERowException(
      `O método 'ERow.getSheetERowsMap' espera o parâmetro 'sheet' to tipo 'Sheet' \
      ('${typeof sheet}' enviado)`
    );
  }

  const ssId = sheet.getParent().getId();
  const sheetName = sheet.getName();

  const { cached } = ERow.getSheetERowsMap;

  if (!cached[ssId]) cached[ssId] = {};

  if (!cached[ssId][sheetName]) {
    if (createIfNotExists) {
      cached[ssId][sheetName] =
        sheet.getDataRange().getValues()
          .reduce((map, rowData, rowIndex) => {
            if (rowIndex != 0) {
              const rowNumber = rowIndex + 1;
              const data = ERow.getObjectFromRowData(sheet, rowData, rowNumber);
              map.set(rowNumber, new ERow(ssId, sheetName, data, rowNumber));
            }
            return map;
          }, new Map());
    }
  }
  return cached[ssId][sheetName];
};
ERow.getSheetERowsMap.cached = {};

ERow.updateSheetERowsMap = function (eRow, oldRowNumber) {
  const sheet = eRow.getSheet();
  const map = ERow.getSheetERowsMap(sheet);

  if (!map) return;

  const currentRowNumber = eRow.getRowNumber();

  const rowWasJustDeleted = oldRowNumber && !currentRowNumber;

  const maxRowNumber = map.size + 1;

  if (rowWasJustDeleted) {
    map.delete(oldRowNumber);
    for (
      let rowNumber = oldRowNumber + 1;
      rowNumber <= maxRowNumber;
      rowNumber++
    ) {
      const nextERow = map.get(rowNumber);
      if (nextERow) {
        nextERow.rowNumber = rowNumber - 1;
        ERow.updateSheetERowsMap(nextERow, rowNumber);
      }
      map.delete(rowNumber);
    }
  } else {
    //Testa se o valor de 'rowNumber' é compatível com o tamanho do Map
    if (currentRowNumber > maxRowNumber + 1) {
      throw new ERowException(
        `O próximo valor de 'rowNumber' na planilha '${sheetName}' seria \
        ${maxRowNumber + 1} e não ${currentRowNumber}!`
      );
    }
    //Testa se existe uma ERow válida na posição correspondente a 'currentRowNumber' do Map
    const thereIsERowInPosition = map.get(currentRowNumber);

    if (thereIsERowInPosition) {
      const foundERowRowNumber = thereIsERowInPosition.getRowNumber();

      //Se 'foundERowHasSameRowNumber' == true,
      //eRow encontrada foi duplicada
      const foundERowHasSameRowNumber = foundERowRowNumber == currentRowNumber;

      //Se 'foundERowHasEmptyRowNumber' == true,
      //eRow encontrada foi excluída
      const foundERowHasEmptyRowNumber = !foundERowRowNumber;
      if (foundERowHasSameRowNumber || foundERowHasEmptyRowNumber) {
        thereIsERowInPosition.rowNumber = currentRowNumber + 1;
        ERow.updateSheetERowsMap(thereIsERowInPosition, foundERowRowNumber);
      } else {
        throw new ERowException(
          `Foi encontrada uma ERow válida na posição '${currentRowNumber}' \
          com 'rowNumber' igual a '${foundERowRowNumber}'`
        );
      }
    }
    map.set(currentRowNumber, eRow);
  }
};

ERow.getNextRowNumberBySheet = function (sheet) {
  const map = ERow.getSheetERowsMap(sheet);
  if(map){
    return map.size + 2;
  }else{
    return sheet.getLastRow()+1;
  }
};

/**
 *
 * @param {object} params Um objeto com os parâmetros para ser passados
 *  para a função
 * @param {Sheet} params.sheetMirror A planilha espelho
 * @param {Sheet} params.sheetOrigin A planilha de origem (fonte da verdade)
 * @param {string} params.columnName Uma string representando a chave primária
 * (obrigatoriamente algum valor encontrado no cabeçalho da planilha)
 * @param {Function} conditionToPull Uma função com a condição para que a linha
 * da planilha origem seja copiada na planilha espelho
 * @param {Function} conditionToPush Uma função com a condição para que a linha
 * da planilha espelho seja sincronizada à planilha origem
 * @param {Function} [modifyMirrorERowsFunction] Função que modifica a linha recém
 * adicionada à planilha espelho
 * @param {int} [sheetMirrorLimitRows] Quantidade máxima de linhas que a planilha
 * espelho terá além do cabeçalho
 * @param {Function} [sheetOriginSortFunction] Uma função opcional para ordenar a posição das ERows
 * @returns {int}
 */
ERow.syncMirrorERows = function (params) {
  let {
    sheetMirror,
    sheetOrigin,
    columnName,
    conditionToPush,
    conditionToPull,
    modifyMirrorERowsFunction,
    sheetMirrorLimitRows,
    sheetOriginSortFunction,
  } = params;

  const sheetMirrorERowsMap = ERow.getSheetERowsMap({
    sheet: sheetMirror,
    columnName,
  });

  const sheetOriginERowsMap = ERow.getSheetERowsMap({
    sheet: sheetOrigin,
    columnName,
    condition: conditionToPull,
    eRowsSortFunction: sheetOriginSortFunction,
  });

  let rowsUpdated = 0;
  let sheetMirrorLastRow = sheetMirror.getLastRow();

  [...sheetMirrorERowsMap.keys()].reverse().forEach((columnNameValue) => {
    const mirrorERows = sheetMirrorERowsMap.get(columnNameValue);

    mirrorERows.reverse().forEach((mirrorERow) => {
      const data = mirrorERow.getData();

      if (conditionToPush(data)) {
        const originERows = sheetOriginERowsMap.get(columnNameValue);

        if (originERows) {
          originERows.forEach((originERow) => {
            originERow.mirrorERow(mirrorERow).save();
          });
        }
        if (sheetMirrorLastRow == 2) {
          sheetMirror.getRange("2:2").clearContent().clearDataValidations();
        } else {
          mirrorERow.delete();
          sheetMirrorLastRow--;
        }
        rowsUpdated++;
      }
    });
  });

  let remainingToAdd = sheetMirrorLimitRows
    ? sheetMirrorLimitRows - sheetMirrorLastRow + 1
    : 1000000;

  sheetOriginERowsMap.forEach((originERows, columnNameValue) => {
    if (!sheetMirrorLimitRows || remainingToAdd > 0) {
      const originERow = originERows[0];
      const data = originERow.getData();

      if (conditionToPull(data)) {
        let mirrorERows = sheetMirrorERowsMap.get(columnNameValue);
        if (!mirrorERows) {
          const mirrorERow = new ERow(
            sheetMirror.getParent().getId(),
            sheetMirror.getName()
          ).mirrorERow(originERow);

          if (modifyMirrorERowsFunction) {
            modifyMirrorERowsFunction(mirrorERow);
          }
          mirrorERow.save();
          remainingToAdd--;
        }
      }
    }
  });

  const mirrorFormattingAndDataValidations = () => {
    if (sheetMirrorLastRow <= 2) return;

    const sheetMirrorIndexes = Util.getHeaderIndexes(sheetMirror);
    const sheetOriginIndexes = Util.getHeaderIndexes(sheetOrigin);

    Object.keys(sheetMirrorIndexes).map((key) => {
      try {
        const mirrorColumnLetter = Util.getColumnLetterByColumnIndex(
          sheetMirrorIndexes[key]
        );
        const originColumnLetter = Util.getColumnLetterByColumnIndex(
          sheetOriginIndexes[key]
        );

        const mirrorRangeToApply = sheetMirror.getRange(
          mirrorColumnLetter + "2:" + mirrorColumnLetter
        );
        const originFirstCell = sheetOrigin.getRange(originColumnLetter + "2");

        const originFirstCellValue = originFirstCell.getValue();

        if (
          originFirstCellValue.getMonth ||
          typeof originFirstCellValue == "number"
        ) {
          const numberFormat = originFirstCell.getNumberFormat();

          if (numberFormat)
            sheetMirror
              .getRange(mirrorColumnLetter + "2:" + mirrorColumnLetter)
              .setNumberFormat(numberFormat);
        }
        mirrorRangeToApply.setDataValidation(
          originFirstCell.getDataValidation().copy().build()
        );
      } catch (e) {
        throw new ERowException(
          `Ocorreu um erro ao tentar espelhar formatação e validação`
        );
      }
    });
  };
  mirrorFormattingAndDataValidations();
  return rowsUpdated;
};
