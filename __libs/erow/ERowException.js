class ERowException{
  constructor(msg){
    var stack = "";

    try {
      throw new Error(msg);
    } catch (e) {
      stack = e.stack.replace(/\n[^\n]*GS_INTERNAL_[^\n]*$/i, "");
    }
    this.msg = `[ERowException]\nSTACK: ${stack}`;
    this.original_message = msg;
  }
  /**
  * Retorna uma string que representa a mensagem desta exceção
  * com o stack correspondente
  * @returns {String} A mensagem desta exceção, incluindo o 'stack'.
  */
  toString () {
    return this.msg;
  }

  message () {
    return this.original_message;
  }
}