export interface HelpGuide {
  description: string;
  id: string;
  steps: string[];
  title: string;
}

export interface HelpQuestion {
  answer: string;
  id: string;
  question: string;
}

export const helpGuides: HelpGuide[] = [
  {
    id: 'family',
    title: 'Crear una familia e invitar a alguien',
    description: 'Prepara el espacio compartido donde se coordina el cuidado.',
    steps: [
      'Entra en Familia y crea una familia si todavía no tienes una activa.',
      'Usa el código de invitación para añadir a la madre, al padre o a otra persona cuidadora.',
      'El propietario y los administradores pueden gestionar miembros y bebés; cada persona usa su propia cuenta.',
    ],
  },
  {
    id: 'context',
    title: 'Elegir la familia y el bebé activos',
    description: 'Comprueba el contexto antes de registrar un cuidado.',
    steps: [
      'Toca el selector de la cabecera para abrir Familia y bebé.',
      'Elige la familia y después el bebé que quieres consultar o cuidar.',
      'Los nuevos registros se guardarán únicamente en el bebé activo que aparece en la cabecera.',
    ],
  },
  {
    id: 'handoff',
    title: 'Registrar un cuidado en Relevo',
    description: 'Anota alimentación, pañal, sueño, medidas o una nota familiar.',
    steps: [
      'En Relevo, toca el tipo de cuidado que quieres registrar.',
      'Completa solo los datos que conozcas y revisa la hora del registro.',
      'Guarda el cuidado. La familia podrá verlo y, si tiene los avisos activos, recibirá una notificación.',
    ],
  },
  {
    id: 'records',
    title: 'Consultar, corregir o retirar registros',
    description: 'Revisa el historial y corrige un dato sin duplicar el cuidado.',
    steps: [
      'Abre Registro para consultar el historial del bebé activo.',
      'Usa los filtros y la paginación para localizar el cuidado que necesitas.',
      'Puedes editar tus propios registros. El propietario y los administradores también pueden gestionar los registros de la familia.',
      'Quitar envía el registro a Retirados durante 30 días. Desde allí puede restaurarse antes de su eliminación definitiva.',
    ],
  },
  {
    id: 'summary',
    title: 'Entender el resumen y las tendencias',
    description: 'Compara los cuidados y la evolución del bebé por periodos.',
    steps: [
      'En Registro, abre Resumen y elige 24 horas, 7 días o 30 días.',
      'Las tarjetas muestran los totales del periodo y los gráficos distribuyen esos mismos registros en el tiempo.',
      'Toca una barra o un punto para consultar su valor. Las medidas comparan peso y altura desde el nacimiento.',
    ],
  },
  {
    id: 'baby',
    title: 'Mantener actualizado el perfil del bebé',
    description: 'Guarda datos básicos, foto y medidas útiles para la familia.',
    steps: [
      'En Bebé puedes editar el nombre, fecha de nacimiento, sexo, tipo de sangre, foto y observaciones.',
      'Registra peso y altura desde Relevo para conservar la evolución sin sustituir las medidas anteriores.',
      'Si el bebé aún no ha nacido, completa solo la información disponible y actualízala después del nacimiento.',
    ],
  },
  {
    id: 'stories',
    title: 'Compartir una historia durante 24 horas',
    description: 'Comparte un momento privado y temporal con la familia.',
    steps: [
      'En Relevo, toca Tu historia y selecciona una foto.',
      'La historia será visible para la familia durante 24 horas.',
      'Solo la persona que subió la historia puede eliminarla antes de que caduque.',
    ],
  },
  {
    id: 'notifications',
    title: 'Activar y revisar las notificaciones',
    description: 'Recibe avisos en cada dispositivo donde quieras estar al día.',
    steps: [
      'En Mi cuenta y ajustes, abre Notificaciones y permite los avisos del dispositivo.',
      'Elige qué actividades quieres recibir. La configuración se aplica a ese dispositivo.',
      'Si cambias de móvil o instalas la web como PWA, activa los avisos también allí.',
    ],
  },
  {
    id: 'account',
    title: 'Gestionar tu cuenta y tus datos',
    description: 'Controla apariencia, exportación y privacidad desde Ajustes.',
    steps: [
      'Abre tu avatar y entra en Mi cuenta y ajustes.',
      'Desde allí puedes cambiar el tema, descargar una copia de tus aportaciones —incluidos tus contactos y documentos— y repetir la introducción.',
      'El propietario y los administradores también pueden exportar una copia compartida de toda la familia desde Familia.',
      'La eliminación de cuenta está separada del resto de acciones para evitar borrados accidentales.',
    ],
  },
];

export const helpQuestions: HelpQuestion[] = [
  {
    id: 'privacy',
    question: '¿Quién puede ver la información del bebé?',
    answer:
      'Solo las personas que pertenecen a la familia autorizada. Cada invitación y cada rol determinan qué puede consultar o gestionar una persona.',
  },
  {
    id: 'mistake',
    question: '¿Qué hago si registré algo por error?',
    answer:
      'Localiza el cuidado en Registro. Puedes editarlo si lo creaste o quitarlo si tu rol lo permite. Los registros retirados se conservan 30 días para poder restaurarlos.',
  },
  {
    id: 'realtime',
    question: '¿Por qué no veo inmediatamente un cambio?',
    answer:
      'Comprueba que estás viendo la misma familia y el mismo bebé, y usa Actualizar si la conexión en tiempo real se interrumpió. No vuelvas a guardar el cuidado sin comprobar el historial para evitar duplicados.',
  },
  {
    id: 'medical',
    question: '¿Niduna sustituye el seguimiento pediátrico?',
    answer:
      'No. Niduna organiza información compartida por la familia, pero no diagnostica, prescribe ni sustituye las indicaciones de profesionales sanitarios.',
  },
];
