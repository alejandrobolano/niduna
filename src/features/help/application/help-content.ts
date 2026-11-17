export interface HelpGuideSection {
  steps: string[];
  title: string;
}

export interface HelpGuide {
  description: string;
  id: string;
  sections?: HelpGuideSection[];
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
      'En cada dispositivo, abre Mi cuenta y ajustes > Notificaciones y toca Activar en este dispositivo.',
      'Acepta el permiso cuando lo solicite el navegador o el sistema. Después podrás elegir qué actividades quieres recibir.',
      'Si no aparece la pregunta, revisa el apartado correspondiente a tu navegador o aplicación y vuelve a tocar Activar.',
    ],
    sections: [
      {
        title: 'Chrome',
        steps: [
          'En Android o en el ordenador, abre Niduna, toca el icono de información del sitio junto a la dirección y entra en Permisos > Notificaciones > Permitir.',
          'Si usas la PWA en Android, revisa también Ajustes del teléfono > Aplicaciones > Niduna > Notificaciones.',
          'Chrome no entrega notificaciones mientras navegas en modo incógnito.',
        ],
      },
      {
        title: 'Microsoft Edge',
        steps: [
          'Abre Niduna, selecciona el icono de información situado a la izquierda de la dirección y entra en Permisos para este sitio.',
          'Cambia Notificaciones a Permitir. Si Niduna está instalada, también puedes revisar sus permisos desde edge://apps.',
        ],
      },
      {
        title: 'Opera',
        steps: [
          'Abre Configuración > Privacidad y seguridad > Configuración de sitios > Notificaciones.',
          'Comprueba que Niduna no esté bloqueada y añádela a los sitios permitidos. En Android, revisa además los permisos de notificaciones de Opera o Niduna en los ajustes del teléfono.',
        ],
      },
      {
        title: 'Safari y PWA en iPhone o iPad',
        steps: [
          'En iPhone o iPad, los avisos web requieren iOS o iPadOS 16.4 o posterior y Niduna instalada en la pantalla de inicio. No se activan desde una pestaña normal de Safari.',
          'Abre Niduna desde su icono instalado, entra en Mi cuenta y ajustes > Notificaciones y toca Activar en este dispositivo.',
          'Si ya los bloqueaste, abre Ajustes > Notificaciones > Niduna, activa Permitir notificaciones y vuelve a Niduna.',
          'En Mac, revisa Safari > Ajustes > Sitios web > Notificaciones y establece Niduna en Permitir.',
        ],
      },
      {
        title: 'Aplicación nativa',
        steps: [
          'Dentro de Niduna, toca Activar en este dispositivo y acepta el aviso del sistema.',
          'Si el permiso se bloqueó, usa Abrir ajustes del dispositivo o entra manualmente en Ajustes > Aplicaciones > Niduna > Notificaciones y actívalas.',
        ],
      },
    ],
  },
  {
    id: 'install-pwa',
    title: 'Instalar Niduna como aplicación web',
    description: 'Añade la PWA a la pantalla de inicio o al escritorio.',
    steps: [
      'Abre Niduna en el navegador donde quieras instalarla e inicia sesión.',
      'Sigue los pasos de tu navegador y abre Niduna desde el nuevo icono.',
      'Activa las notificaciones dentro de la aplicación instalada; el permiso no siempre se comparte con la pestaña del navegador.',
    ],
    sections: [
      {
        title: 'Chrome',
        steps: [
          'Android: abre el menú de tres puntos, toca Instalar aplicación o Añadir a pantalla de inicio y confirma Instalar.',
          'Ordenador: usa el icono Instalar de la barra de direcciones; si no aparece, abre el menú de Chrome y busca Instalar página como aplicación.',
        ],
      },
      {
        title: 'Microsoft Edge',
        steps: [
          'Abre Configuración y más > Más herramientas > Aplicaciones > Instalar este sitio como una aplicación.',
          'Después puedes administrarla y revisar sus permisos desde edge://apps.',
        ],
      },
      {
        title: 'Opera',
        steps: [
          'Android: abre el menú situado junto a la barra de direcciones, toca Añadir a y elige Pantalla de inicio.',
          'Ordenador: si aparece el icono de instalación en la barra de direcciones, selecciónalo y confirma. La disponibilidad puede variar según la versión de Opera.',
        ],
      },
      {
        title: 'Safari',
        steps: [
          'iPhone o iPad: toca Compartir > Añadir a pantalla de inicio, activa Abrir como app web y confirma Añadir.',
          'Mac con macOS Sonoma 14 o posterior: abre Archivo > Añadir al Dock y confirma.',
        ],
      },
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
