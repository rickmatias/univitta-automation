const FeegowAPI = {};

FeegowAPI.BASE_URL = "https://api.feegow.com/v1/api/";

FeegowAPI.TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJmZWVnb3ciLCJhdWQiOiJwdWJsaW" +
  "NhcGkiLCJpYXQiOiIxNi0wOS0yMDE4IiwibGljZW5zZUlEIjoiNTYwMyJ9.uQR1N6OB91Aqldie" +
  "LRIkLVL817ZrnLFgk5LTD6xnJ3Y";

FeegowAPI.DR_RICARDO_ID = 1;
FeegowAPI.ROSANE_ID = 22;

FeegowAPI.Status = {
  SCHEDULED_NOT_CONFIRMED: 1,
  IN_SERVICE: 2,
  ATTENDED: 3,
  WAITING: 4,
  CALLING: 5,
  NO_SHOW: 6,
  SCHEDULED_CONFIRMED: 7,
  UNMARKED: 11,
  REAGENDED: 15,
};

FeegowAPI.options = {
  muteHttpExceptions: true,
  ContentType: "application/json",
  Host: "api.feegow.com/v1",
  headers: {
    "x-access-token": FeegowAPI.TOKEN,
  },
};

FeegowAPI.getQueryString = function (payload) {
  let query = "";
  if (payload) {
    for (let property in payload) {
      if (payload.hasOwnProperty(property))
        query += property + "=" + payload[property] + "&";
    }
    query = query.replace(/\&$/, "");
  }
  return query;
};

FeegowAPI.post = function (route, params) {
  let url = FeegowAPI.BASE_URL + route;
  let response = UrlFetchApp.fetch(url, params);
  let contentText = response.getContentText();
  let content = contentText ? JSON.parse(contentText) : {};

  if (response.getResponseCode() != 200) {
    throw (
      "Feegow API retornou STATUS Code " +
      response.getResponseCode() +
      ".\n" +
      "Route: '" +
      route +
      "'\n" +
      "Payload: " +
      JSON.stringify(params) +
      ".\n" +
      "URL: " +
      url +
      ".\n" +
      "Content: " +
      JSON.stringify(content)
    );
  }

  if (!content || !content.success) {
    console.log(
      "Ocorreu um erro inesperado ao chamar a API do Feegow\n" +
        "Rota: " +
        route +
        "\n" +
        "Params: " +
        JSON.stringify(params)
    );

    throw "Ocorreu um erro inesperado ao chamar a API do Feegow";
  }

  return content.success;
};

FeegowAPI.getFetchedObjects = function (
  route,
  payload,
  filterFormula = undefined
) {
  let query = route + "?" + FeegowAPI.getQueryString(payload);
  let url = FeegowAPI.BASE_URL + query;

  const cache = CacheService.getScriptCache();

  const cached = cache.get(query);
  let content;

  if (cached) {
    content = JSON.parse(cached);
  } else {
    let response = UrlFetchApp.fetch(url, FeegowAPI.options);
    let contentText = response.getContentText();
    if (response.getResponseCode() != 200) {
      throw (
        "Feegow API retornou STATUS Code " +
        response.getResponseCode() +
        ".\n" +
        "Route: '" +
        route +
        "'\n" +
        "Payload: " +
        JSON.stringify(payload) +
        ".\n" +
        "URL: " +
        url +
        ".\n" +
        "Content: " +
        contentText
      );
    }
    content = JSON.parse(contentText);

    if (!content || !content.success)
      throw "Ocorreu um erro inesperado ao chamar a API do Feegow";

    content = content.content;

    let expireInterval;

    switch (route) {
      case "appoints/search": {
        expireInterval = 1 * 30 * 60;
        break;
      }
      default: {
        expireInterval = 6 * 60 * 60;
        break;
      }
    }
    cache.put(query, JSON.stringify(content), expireInterval);
  }

  return filterFormula ? content.filter(filterFormula) : content;
};

FeegowAPI.getPatientById = function (id, getAttendingsDetails = false) {
  let patient = FeegowAPI.getFetchedObjects("patient/search", {
    paciente_id: id,
  });
  if (patient) {
    patient.id = id;
    patient.whatsapp = patient.celulares[0] || patient.celulares[1];

    if (getAttendingsDetails) {
      let lastAppointment = FeegowAPI.getLastAppointmentByPatient(id);
      let nextAppointment = FeegowAPI.getNextAppointmentByPatient(id);

      if (lastAppointment)
        patient.ultimaConsulta =
          lastAppointment.data + " " + lastAppointment.horario;

      if (nextAppointment)
        patient.proximaConsulta =
          nextAppointment.data + " " + nextAppointment.horario;
    }

    return patient;
  }
  return false;
};

FeegowAPI.getProfessionalById = function (id) {
  let professional = FeegowAPI.getFetchedObjects("professional/search", {
    profissional_id: id,
  });

  if (professional) {
    switch (professional.TratamentoID) {
      case 2: {
        professional.informacoes.tratamento = "Dr.";
        break;
      }
      case 3: {
        professional.informacoes.tratamento = "Dra.";
        break;
      }
      case 4: {
        professional.informacoes.tratamento = "Sr.";
        break;
      }
      case 5: {
        professional.informacoes.tratamento = "Sra.";
        break;
      }
      default: {
        professional.informacoes.tratamento = "";
        break;
      }
    }
  }
  return professional;
};

FeegowAPI.getReports = function () {
  return FeegowAPI.getFetchedObjects("reports/list");
};

FeegowAPI.getProcedureById = function (procedureId) {
  return FeegowAPI.getFetchedObjects("procedures/list", {
    procedimento_id: procedureId,
  });
};

/*
 * @param {Date} startDate
 * @param {Date} endDate
 * @return Object[]|false
 */
FeegowAPI.getAppointments = function (
  startDate,
  endDate,
  patientId = null,
  professionalId = null,
  appointmentId = null,
  arrOfStatus = undefined
) {
  let payload;
  if (startDate && endDate && startDate.getMonth && endDate.getMonth) {
    let startDateString = Utilities.formatDate(
      startDate,
      "GMT-03:00",
      "dd-MM-yyyy"
    );
    let endDateString = Utilities.formatDate(
      endDate,
      "GMT-03:00",
      "dd-MM-yyyy"
    );

    payload = {
      data_start: startDateString,
      data_end: endDateString,
    };
    if (professionalId) payload.profissional_id = professionalId;
    if (patientId) payload.paciente_id = patientId;
    if (appointmentId) payload.agendamento_id = appointmentId;
  } else if (appointmentId != null) {
    payload = { agendamento_id: appointmentId };
  } else {
    throw (
      "Se 'appointmentId' não for passado, os parámetros 'startDate' e 'endDate' (ambos tipo 'String') " +
      "precisam ser passados."
    );
  }

  let hasSameStatusId;

  if (arrOfStatus) {
    hasSameStatusId = (r) => arrOfStatus.includes(r["status_id"]);
  }

  let fetchedObjects = FeegowAPI.getFetchedObjects(
    "appoints/search",
    payload,
    hasSameStatusId
  );

  if (fetchedObjects) {
    return fetchedObjects.map(function (obj) {
      obj.objeto_data = Util.getDateFromString(obj.data + " " + obj.horario);
      obj.status = FeegowAPI.getAppointmentStatus(obj.status_id);
      obj.paciente = FeegowAPI.getPatientById(obj.paciente_id);
      obj.profissional = FeegowAPI.getProfessionalById(obj.profissional_id);
      obj.procedimento = FeegowAPI.getProcedureById(obj.procedimento_id)[0];
      return obj;
    });
  }
  return false;
};

FeegowAPI.getLastAppointmentByPatient = function (
  patientId,
  professionalId = FeegowAPI.DR_RICARDO_ID
) {
  let endDate = new Date();
  let startDate = Util.sumDate(endDate, "-179d");
  let minimumDate = Util.sumDate(endDate, "-36m");
  let foundAppointment = false;

  const { ATTENDED, WAITING, CALLING } = FeegowAPI.Status;

  while (!foundAppointment && startDate > minimumDate) {
    startDate = Util.sumDate(endDate, "-179d");

    let appointments = FeegowAPI.getAppointments(
      startDate,
      endDate,
      patientId,
      professionalId,
      null,
      [ATTENDED, WAITING, CALLING]
    );

    if (appointments && appointments.length) {
      foundAppointment = appointments[appointments.length - 1];
    } else {
      endDate = Util.sumDate(endDate, "-179d");
      startDate = Util.sumDate(startDate, "-179d");
    }
  }
  return foundAppointment;
};

FeegowAPI.getNextAppointmentByPatient = function (
  patientId,
  professionalId = FeegowAPI.DR_RICARDO_ID
) {
  let startDate = new Date();
  let endDate;
  let maximumDate = Util.sumDate(startDate, "12m");
  let foundAppointment = false;

  while (!foundAppointment && (!endDate || endDate < maximumDate)) {
    endDate = Util.sumDate(startDate, "179d");

    let appointments = FeegowAPI.getAppointments(
      endDate,
      startDate,
      patientId,
      professionalId
    );

    if (appointments && appointments.length) {
      foundAppointment = appointments[appointments.length - 1];
    } else {
      startDate = Util.sumDate(startDate, "179d");
      endDate = Util.sumDate(endDate, "179d");
    }
  }
  return foundAppointment;
};

FeegowAPI.getAppointmentStatus = function (statusId) {
  let hasSameStatusId = (c) => c["id"] == statusId;
  let fetchedObjects = FeegowAPI.getFetchedObjects(
    "appoints/status",
    null,
    hasSameStatusId
  );

  if (fetchedObjects) {
    return fetchedObjects[0].status;
  }

  throw "Não foi encontrado nenhum status com o id '" + id + "'.";
};

FeegowAPI.getLocalNameById = function (localId) {
  let hasSameLocalId = (r) => r["id"] == localId;
  let fetchedObjects = FeegowAPI.getFetchedObjects(
    "company/list-local",
    null,
    hasSameLocalId
  );

  if (fetchedObjects) {
    return fetchedObjects[0].local;
  }

  throw "Não foi encontrado nenhum local com o id '" + id + "'.";
};

FeegowAPI.updatePatient = function (patient) {
  let { paciente_id, cpf, data_nascimento, genero, telefone, celular } =
    patient;

  if (paciente_id) {
    patient.paciente_id = paciente_id + "";
  }

  if (cpf) {
    patient.cpf = cpf.replace(/\D/g, "");
  }

  if (data_nascimento) {
    if (Util.whatIsIt(data_nascimento) !== "Date") {
      data_nascimento = Util.getDateFromString(data_nascimento);
    }
    patient.data_nascimento = Util.getDateFormated(
      data_nascimento,
      "yyyy-mm-dd"
    );
  }

  if (genero) {
    genero = genero.replace(/[ae].*/, "").toUpperCase();
    if (genero.match(/M|F/)) patient.genero = genero;
    else delete patient.genero;
  }

  if (telefone) {
    telefone = telefone.replace(/\D/g, "");
    if (!Util.isLocalHomePhone(telefone)) {
      patient.telefone = "";
      if (Util.isLocalMobilePhone(telefone)) {
        patient.celular = telefone;
      }
    } else {
      patient.telefone = telefone;
    }
  }

  if (celular) {
    celular = celular.replace(/\D/g, "");
    if (!Util.isLocalMobilePhone(celular)) {
      patient.celular = "";

      if (Util.isLocalHomePhone(celular)) {
        patient.telefone = celular;
      }
    } else {
      patient.celular = celular;
    }
  }

  let payload = [
    "paciente_id",
    "nome_completo",
    "cpf",
    "email",
    "data_nascimento",
    "genero",
    "telefone",
    "celular",
  ].reduce((obj, key) => {
    if (patient[key] !== undefined) {
      obj[key] = patient[key];
    }
    return obj;
  }, {});

  const params = {
    ...FeegowAPI.options,
    method: "post",
    payload: payload,
  };

  return FeegowAPI.post("patient/edit", params);
};
