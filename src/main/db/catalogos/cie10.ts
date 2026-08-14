/**
 * Subconjunto de CIE-10 de uso frecuente en medicina general.
 * El buscador y el esquema admiten el catalogo completo (~14.000 codigos):
 * para ampliarlo basta agregar filas a esta lista o importar el catalogo oficial.
 */
export interface FilaCie10 {
  codigo: string
  descripcion: string
  categoria: string
}

export const CIE10_BASE: FilaCie10[] = [
  // Infecciosas y parasitarias
  { codigo: 'A06.0', descripcion: 'Disentería amebiana aguda', categoria: 'Infecciosas' },
  { codigo: 'A09', descripcion: 'Diarrea y gastroenteritis de presunto origen infeccioso', categoria: 'Infecciosas' },
  { codigo: 'A16.9', descripcion: 'Tuberculosis respiratoria sin confirmación', categoria: 'Infecciosas' },
  { codigo: 'A90', descripcion: 'Fiebre del dengue', categoria: 'Infecciosas' },
  { codigo: 'A91', descripcion: 'Fiebre del dengue hemorrágico', categoria: 'Infecciosas' },
  { codigo: 'B01.9', descripcion: 'Varicela sin complicaciones', categoria: 'Infecciosas' },
  { codigo: 'B02.9', descripcion: 'Herpes zóster sin complicaciones', categoria: 'Infecciosas' },
  { codigo: 'B15.9', descripcion: 'Hepatitis A aguda sin coma hepático', categoria: 'Infecciosas' },
  { codigo: 'B34.9', descripcion: 'Infección viral no especificada', categoria: 'Infecciosas' },
  { codigo: 'B35.3', descripcion: 'Tiña del pie', categoria: 'Infecciosas' },
  { codigo: 'B35.4', descripcion: 'Tiña del cuerpo', categoria: 'Infecciosas' },
  { codigo: 'B36.0', descripcion: 'Pitiriasis versicolor', categoria: 'Infecciosas' },
  { codigo: 'B37.3', descripcion: 'Candidiasis vulvovaginal', categoria: 'Infecciosas' },
  { codigo: 'B54', descripcion: 'Paludismo no especificado', categoria: 'Infecciosas' },
  { codigo: 'B82.9', descripcion: 'Parasitosis intestinal no especificada', categoria: 'Infecciosas' },
  { codigo: 'B86', descripcion: 'Escabiosis', categoria: 'Infecciosas' },

  // Sangre
  { codigo: 'D50.9', descripcion: 'Anemia por deficiencia de hierro sin especificar', categoria: 'Sangre' },
  { codigo: 'D64.9', descripcion: 'Anemia no especificada', categoria: 'Sangre' },

  // Endocrinas y metabólicas
  { codigo: 'E03.9', descripcion: 'Hipotiroidismo no especificado', categoria: 'Endocrinas' },
  { codigo: 'E05.9', descripcion: 'Tirotoxicosis no especificada', categoria: 'Endocrinas' },
  { codigo: 'E10.9', descripcion: 'Diabetes mellitus tipo 1 sin complicaciones', categoria: 'Endocrinas' },
  { codigo: 'E11.9', descripcion: 'Diabetes mellitus tipo 2 sin complicaciones', categoria: 'Endocrinas' },
  { codigo: 'E44.0', descripcion: 'Desnutrición proteicocalórica moderada', categoria: 'Endocrinas' },
  { codigo: 'E66.9', descripcion: 'Obesidad no especificada', categoria: 'Endocrinas' },
  { codigo: 'E78.0', descripcion: 'Hipercolesterolemia pura', categoria: 'Endocrinas' },
  { codigo: 'E78.5', descripcion: 'Hiperlipidemia no especificada', categoria: 'Endocrinas' },
  { codigo: 'E86', descripcion: 'Depleción de volumen (deshidratación)', categoria: 'Endocrinas' },

  // Salud mental
  { codigo: 'F10.2', descripcion: 'Dependencia del alcohol', categoria: 'Salud mental' },
  { codigo: 'F17.2', descripcion: 'Dependencia del tabaco', categoria: 'Salud mental' },
  { codigo: 'F32.9', descripcion: 'Episodio depresivo no especificado', categoria: 'Salud mental' },
  { codigo: 'F41.1', descripcion: 'Trastorno de ansiedad generalizada', categoria: 'Salud mental' },
  { codigo: 'F41.9', descripcion: 'Trastorno de ansiedad no especificado', categoria: 'Salud mental' },
  { codigo: 'F43.2', descripcion: 'Trastorno de adaptación', categoria: 'Salud mental' },
  { codigo: 'F51.0', descripcion: 'Insomnio no orgánico', categoria: 'Salud mental' },

  // Sistema nervioso
  { codigo: 'G43.9', descripcion: 'Migraña no especificada', categoria: 'Sistema nervioso' },
  { codigo: 'G44.2', descripcion: 'Cefalea tensional', categoria: 'Sistema nervioso' },
  { codigo: 'G47.0', descripcion: 'Trastornos del inicio y mantenimiento del sueño', categoria: 'Sistema nervioso' },
  { codigo: 'G56.0', descripcion: 'Síndrome del túnel carpiano', categoria: 'Sistema nervioso' },
  { codigo: 'G62.9', descripcion: 'Polineuropatía no especificada', categoria: 'Sistema nervioso' },

  // Ojo y oído
  { codigo: 'H10.9', descripcion: 'Conjuntivitis no especificada', categoria: 'Ojo y oído' },
  { codigo: 'H25.9', descripcion: 'Catarata senil no especificada', categoria: 'Ojo y oído' },
  { codigo: 'H52.4', descripcion: 'Presbicia', categoria: 'Ojo y oído' },
  { codigo: 'H60.9', descripcion: 'Otitis externa no especificada', categoria: 'Ojo y oído' },
  { codigo: 'H61.2', descripcion: 'Cerumen impactado', categoria: 'Ojo y oído' },
  { codigo: 'H66.9', descripcion: 'Otitis media no especificada', categoria: 'Ojo y oído' },
  { codigo: 'H81.1', descripcion: 'Vértigo paroxístico benigno', categoria: 'Ojo y oído' },

  // Circulatorio
  { codigo: 'I10', descripcion: 'Hipertensión esencial (primaria)', categoria: 'Circulatorio' },
  { codigo: 'I20.9', descripcion: 'Angina de pecho no especificada', categoria: 'Circulatorio' },
  { codigo: 'I25.9', descripcion: 'Cardiopatía isquémica crónica no especificada', categoria: 'Circulatorio' },
  { codigo: 'I48', descripcion: 'Fibrilación y aleteo auricular', categoria: 'Circulatorio' },
  { codigo: 'I50.9', descripcion: 'Insuficiencia cardíaca no especificada', categoria: 'Circulatorio' },
  { codigo: 'I64', descripcion: 'Accidente cerebrovascular no especificado', categoria: 'Circulatorio' },
  { codigo: 'I83.9', descripcion: 'Várices de miembros inferiores sin úlcera ni inflamación', categoria: 'Circulatorio' },
  { codigo: 'I84.9', descripcion: 'Hemorroides sin complicación', categoria: 'Circulatorio' },

  // Respiratorio
  { codigo: 'J00', descripcion: 'Rinofaringitis aguda (resfriado común)', categoria: 'Respiratorio' },
  { codigo: 'J01.9', descripcion: 'Sinusitis aguda no especificada', categoria: 'Respiratorio' },
  { codigo: 'J02.9', descripcion: 'Faringitis aguda no especificada', categoria: 'Respiratorio' },
  { codigo: 'J03.9', descripcion: 'Amigdalitis aguda no especificada', categoria: 'Respiratorio' },
  { codigo: 'J04.0', descripcion: 'Laringitis aguda', categoria: 'Respiratorio' },
  { codigo: 'J06.9', descripcion: 'Infección aguda de vías respiratorias superiores', categoria: 'Respiratorio' },
  { codigo: 'J11.1', descripcion: 'Influenza con otras manifestaciones respiratorias', categoria: 'Respiratorio' },
  { codigo: 'J18.9', descripcion: 'Neumonía no especificada', categoria: 'Respiratorio' },
  { codigo: 'J20.9', descripcion: 'Bronquitis aguda no especificada', categoria: 'Respiratorio' },
  { codigo: 'J30.4', descripcion: 'Rinitis alérgica no especificada', categoria: 'Respiratorio' },
  { codigo: 'J44.9', descripcion: 'Enfermedad pulmonar obstructiva crónica no especificada', categoria: 'Respiratorio' },
  { codigo: 'J45.9', descripcion: 'Asma no especificada', categoria: 'Respiratorio' },

  // Digestivo
  { codigo: 'K02.9', descripcion: 'Caries dental no especificada', categoria: 'Digestivo' },
  { codigo: 'K21.0', descripcion: 'Reflujo gastroesofágico con esofagitis', categoria: 'Digestivo' },
  { codigo: 'K21.9', descripcion: 'Reflujo gastroesofágico sin esofagitis', categoria: 'Digestivo' },
  { codigo: 'K25.9', descripcion: 'Úlcera gástrica no especificada', categoria: 'Digestivo' },
  { codigo: 'K29.7', descripcion: 'Gastritis no especificada', categoria: 'Digestivo' },
  { codigo: 'K30', descripcion: 'Dispepsia', categoria: 'Digestivo' },
  { codigo: 'K52.9', descripcion: 'Gastroenteritis y colitis no infecciosa', categoria: 'Digestivo' },
  { codigo: 'K57.9', descripcion: 'Enfermedad diverticular del intestino', categoria: 'Digestivo' },
  { codigo: 'K58.9', descripcion: 'Síndrome del colon irritable sin diarrea', categoria: 'Digestivo' },
  { codigo: 'K59.0', descripcion: 'Estreñimiento', categoria: 'Digestivo' },
  { codigo: 'K80.2', descripcion: 'Cálculo de la vesícula biliar sin colecistitis', categoria: 'Digestivo' },

  // Piel
  { codigo: 'L01.0', descripcion: 'Impétigo', categoria: 'Piel' },
  { codigo: 'L02.9', descripcion: 'Absceso cutáneo, furúnculo y ántrax', categoria: 'Piel' },
  { codigo: 'L03.9', descripcion: 'Celulitis no especificada', categoria: 'Piel' },
  { codigo: 'L20.9', descripcion: 'Dermatitis atópica no especificada', categoria: 'Piel' },
  { codigo: 'L23.9', descripcion: 'Dermatitis alérgica de contacto', categoria: 'Piel' },
  { codigo: 'L29.9', descripcion: 'Prurito no especificado', categoria: 'Piel' },
  { codigo: 'L30.9', descripcion: 'Dermatitis no especificada', categoria: 'Piel' },
  { codigo: 'L50.9', descripcion: 'Urticaria no especificada', categoria: 'Piel' },
  { codigo: 'L70.0', descripcion: 'Acné vulgar', categoria: 'Piel' },

  // Musculoesquelético
  { codigo: 'M06.9', descripcion: 'Artritis reumatoide no especificada', categoria: 'Musculoesquelético' },
  { codigo: 'M10.9', descripcion: 'Gota no especificada', categoria: 'Musculoesquelético' },
  { codigo: 'M15.9', descripcion: 'Poliartrosis no especificada', categoria: 'Musculoesquelético' },
  { codigo: 'M17.9', descripcion: 'Gonartrosis no especificada', categoria: 'Musculoesquelético' },
  { codigo: 'M25.5', descripcion: 'Dolor articular', categoria: 'Musculoesquelético' },
  { codigo: 'M53.1', descripcion: 'Síndrome cervicobraquial', categoria: 'Musculoesquelético' },
  { codigo: 'M54.2', descripcion: 'Cervicalgia', categoria: 'Musculoesquelético' },
  { codigo: 'M54.4', descripcion: 'Lumbago con ciática', categoria: 'Musculoesquelético' },
  { codigo: 'M54.5', descripcion: 'Lumbago no especificado', categoria: 'Musculoesquelético' },
  { codigo: 'M62.6', descripcion: 'Distensión muscular', categoria: 'Musculoesquelético' },
  { codigo: 'M75.1', descripcion: 'Síndrome del manguito rotador', categoria: 'Musculoesquelético' },
  { codigo: 'M79.1', descripcion: 'Mialgia', categoria: 'Musculoesquelético' },
  { codigo: 'M79.7', descripcion: 'Fibromialgia', categoria: 'Musculoesquelético' },

  // Genitourinario
  { codigo: 'N10', descripcion: 'Nefritis tubulointersticial aguda (pielonefritis)', categoria: 'Genitourinario' },
  { codigo: 'N18.9', descripcion: 'Enfermedad renal crónica no especificada', categoria: 'Genitourinario' },
  { codigo: 'N20.0', descripcion: 'Cálculo del riñón', categoria: 'Genitourinario' },
  { codigo: 'N30.0', descripcion: 'Cistitis aguda', categoria: 'Genitourinario' },
  { codigo: 'N39.0', descripcion: 'Infección de vías urinarias, sitio no especificado', categoria: 'Genitourinario' },
  { codigo: 'N40', descripcion: 'Hiperplasia de la próstata', categoria: 'Genitourinario' },
  { codigo: 'N76.0', descripcion: 'Vaginitis aguda', categoria: 'Genitourinario' },
  { codigo: 'N91.2', descripcion: 'Amenorrea no especificada', categoria: 'Genitourinario' },
  { codigo: 'N92.0', descripcion: 'Menstruación excesiva con ciclo regular', categoria: 'Genitourinario' },
  { codigo: 'N94.6', descripcion: 'Dismenorrea no especificada', categoria: 'Genitourinario' },
  { codigo: 'N95.1', descripcion: 'Estados menopáusicos y climatéricos femeninos', categoria: 'Genitourinario' },

  // Embarazo
  { codigo: 'O21.0', descripcion: 'Hiperemesis gravídica leve', categoria: 'Embarazo' },
  { codigo: 'Z34.9', descripcion: 'Supervisión de embarazo normal no especificado', categoria: 'Embarazo' },

  // Síntomas y signos
  { codigo: 'R05', descripcion: 'Tos', categoria: 'Síntomas y signos' },
  { codigo: 'R06.0', descripcion: 'Disnea', categoria: 'Síntomas y signos' },
  { codigo: 'R07.4', descripcion: 'Dolor torácico no especificado', categoria: 'Síntomas y signos' },
  { codigo: 'R10.1', descripcion: 'Dolor abdominal localizado en parte superior', categoria: 'Síntomas y signos' },
  { codigo: 'R10.4', descripcion: 'Dolor abdominal no especificado', categoria: 'Síntomas y signos' },
  { codigo: 'R11', descripcion: 'Náusea y vómito', categoria: 'Síntomas y signos' },
  { codigo: 'R21', descripcion: 'Erupción cutánea no especificada', categoria: 'Síntomas y signos' },
  { codigo: 'R35', descripcion: 'Poliuria', categoria: 'Síntomas y signos' },
  { codigo: 'R42', descripcion: 'Mareo y desvanecimiento', categoria: 'Síntomas y signos' },
  { codigo: 'R50.9', descripcion: 'Fiebre no especificada', categoria: 'Síntomas y signos' },
  { codigo: 'R51', descripcion: 'Cefalea', categoria: 'Síntomas y signos' },
  { codigo: 'R53', descripcion: 'Malestar y fatiga', categoria: 'Síntomas y signos' },
  { codigo: 'R55', descripcion: 'Síncope y colapso', categoria: 'Síntomas y signos' },
  { codigo: 'R60.0', descripcion: 'Edema localizado', categoria: 'Síntomas y signos' },
  { codigo: 'R63.0', descripcion: 'Anorexia', categoria: 'Síntomas y signos' },
  { codigo: 'R63.4', descripcion: 'Pérdida anormal de peso', categoria: 'Síntomas y signos' },

  // Lesiones
  { codigo: 'S00.9', descripcion: 'Traumatismo superficial de la cabeza', categoria: 'Lesiones' },
  { codigo: 'S13.4', descripcion: 'Esguince de la columna cervical', categoria: 'Lesiones' },
  { codigo: 'S61.9', descripcion: 'Herida de la muñeca y de la mano', categoria: 'Lesiones' },
  { codigo: 'S83.6', descripcion: 'Esguince de la rodilla', categoria: 'Lesiones' },
  { codigo: 'S93.4', descripcion: 'Esguince del tobillo', categoria: 'Lesiones' },
  { codigo: 'T14.0', descripcion: 'Traumatismo superficial de región no especificada', categoria: 'Lesiones' },
  { codigo: 'T14.1', descripcion: 'Herida de región no especificada', categoria: 'Lesiones' },
  { codigo: 'T30.0', descripcion: 'Quemadura de región no especificada', categoria: 'Lesiones' },
  { codigo: 'T78.2', descripcion: 'Choque anafiláctico no especificado', categoria: 'Lesiones' },
  { codigo: 'T78.4', descripcion: 'Alergia no especificada', categoria: 'Lesiones' },

  // Controles y factores
  { codigo: 'Z00.0', descripcion: 'Examen médico general', categoria: 'Controles' },
  { codigo: 'Z01.4', descripcion: 'Examen ginecológico general', categoria: 'Controles' },
  { codigo: 'Z23', descripcion: 'Necesidad de inmunización', categoria: 'Controles' },
  { codigo: 'Z71.3', descripcion: 'Consulta para instrucción dietética', categoria: 'Controles' },
  { codigo: 'Z76.0', descripcion: 'Consulta para repetición de receta', categoria: 'Controles' }
]
