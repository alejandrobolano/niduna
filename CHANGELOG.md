# Changelog

Todos los cambios relevantes de Niduna se documentan en este archivo mediante
versionado semántico. Cada pull request de producto añade sus cambios a la
sección `Unreleased`; la pull request de publicación los consolida bajo la
versión correspondiente.

## [Unreleased]

### Added

- Gestión privada de documentos PDF, JPG y PNG del bebé, organizados por
  categoría y fecha, con opciones para abrir, guardar, editar, retirar y
  restaurar según los permisos familiares.
- Directorio de contactos del bebé con acceso a llamadas, correo y ubicación,
  apertura en aplicaciones de mapas y opciones vCard y QR para guardarlos o
  compartirlos desde otros dispositivos.
- Informes PDF personalizados a partir de los registros seleccionados, con
  columnas y contactos configurables antes de guardarlos o compartirlos.
- Avatares de animales Nuni asignados según la relación familiar o los datos
  del bebé, con posibilidad de elegir otro animal o utilizar una fotografía.
- Las copias personales incluyen los contactos, los metadatos de documentos y
  los archivos publicados aportados por la persona que solicita la descarga.
- Las copias familiares incluyen los contactos, documentos y archivos
  publicados de toda la familia para propietarios y administradores.

### Changed

- Los apartados cumplimentados del perfil del bebé se protegen frente a cambios
  accidentales mediante controles de bloqueo independientes.
- Relevo, Registro y sus pasos del recorrido guiado solo están disponibles
  cuando la familia tiene un bebé nacido al que se pueda realizar seguimiento.
- El centro de ayuda y las pantallas de exportación distinguen entre la copia
  personal y la copia completa de una familia.

## [1.0.0] - 2026-08-25

### Added

- Primera versión estable para Android, iOS y web.
- Familias privadas con varios bebés, invitaciones y roles de propietario,
  administrador y cuidador.
- Registro compartido de alimentación, pañal, sueño, medidas y notas.
- Historial con filtros, edición, retirada temporal, restauración y exportación.
- Resúmenes de 24 horas, 7 días y 30 días con tendencias de cuidados y medidas.
- Historias familiares privadas que caducan después de 24 horas.
- Notificaciones configurables en aplicaciones nativas y PWA.
- Perfiles del bebé y del usuario con fotografías.
- Pantalla independiente de cuenta y ajustes en `/settings`.
- Recorrido contextual y repetible por Relevo, Registro, Familia y avisos.
- Centro de ayuda con guías paso a paso y preguntas frecuentes.
- Versión actual visible en el panel de cuenta.

## [0.1.0] - 2026-08-22

### Added

- Primera versión beta para coordinación familiar de cuidados, perfiles de bebés,
  registros, historias, notificaciones y exportación de datos.
