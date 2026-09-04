# Changelog

Todos los cambios relevantes de Niduna se documentan en este archivo mediante
versionado semántico. Cada pull request de producto añade sus cambios a la
sección `Unreleased`; la pull request de publicación los consolida bajo la
versión correspondiente.

## [Unreleased]

### Added

- Gestión privada de documentos del bebé con acceso temporal para los miembros
  autorizados de la familia.
- Directorio de contactos del bebé con enlaces externos, ubicaciones, archivos
  vCard y códigos QR para guardarlos en otros dispositivos.
- Informes PDF personalizados a partir de los registros seleccionados.
- Avatares de animales Nuni asignados automáticamente y personalizables para
  bebés y miembros de la familia.
- Las copias personales incluyen los contactos, los metadatos de documentos y
  los archivos publicados aportados por la persona que solicita la descarga.
- Las copias familiares incluyen los contactos, documentos y archivos
  publicados de toda la familia para propietarios y administradores.

### Changed

- Los apartados del perfil del bebé que ya contienen información se protegen
  frente a modificaciones accidentales mediante controles de desbloqueo.
- Relevo y Registro solo se muestran cuando la familia tiene un bebé nacido al
  que se pueda realizar seguimiento.
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
