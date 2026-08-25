# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Niduna sirve a madres, padres, tutores y otras personas autorizadas que comparten el cuidado cotidiano de uno o más bebés. Incluye familiares, cuidadores profesionales y miembros con acceso de solo lectura.

## Product Purpose

Niduna permite que cada persona autorizada entienda qué cuidados recibió el bebé, cuándo ocurrieron y qué puede necesitar después, sin depender de la memoria ni interrumpir el descanso de otro cuidador.

## Positioning

El producto se centra en el relevo familiar: combina un contexto explícito de familia y bebé, registros cotidianos con autoría y hora, y un resumen compartido que ayuda a continuar el cuidado con información consistente.

## Operating Context

La aplicación se usa durante cuidados breves y repetidos, a menudo con una sola mano, poco tiempo y sueño interrumpido. Las familias registran alimentación, pañales, sueño, medidas y notas; consultan el historial, revisan tendencias y coordinan cambios mediante notificaciones. Una persona puede pertenecer a varias familias y cada familia puede tener varios bebés.

## Capabilities and Constraints

- Expo Router y React Native comparten una base TypeScript para Android, iOS y web.
- Supabase proporciona autenticación sin contraseña, Postgres, Realtime y almacenamiento protegido.
- Las invitaciones, relaciones y permisos son conceptos separados.
- Los registros conservan autoría y hora; pueden editarse, retirarse y recuperarse durante 30 días según los permisos.
- Las medidas son eventos históricos con fecha y procedencia, no campos que se sobrescriben.
- Niduna registra y resume información; no diagnostica, prescribe, calcula medicación ni sustituye al pediatra.
- La interfaz inicial está escrita en español y el código técnico usa inglés.

## Brand Commitments

El nombre es Niduna. La comunicación debe ser cercana, tranquila, clara y respetuosa con familias cansadas o bajo presión. Nuni es la mascota visual existente. La identidad infantil y colorida no debe restar legibilidad ni convertir información sensible en entretenimiento.

## Evidence on Hand

- Contexto funcional: `docs/PRODUCT_CONTEXT.md`.
- Decisiones arquitectónicas: `docs/DECISIONS.md`.
- Mascota e iconos de aplicación: `assets/images`.
- La aplicación y sus flujos reales son la evidencia principal; no hay testimonios, métricas clínicas ni afirmaciones médicas que deban inventarse.

## Product Principles

- Priorizar el relevo útil frente a acumular funciones.
- Reducir el tiempo necesario para registrar y comprender un cuidado.
- Mantener el contexto de familia, bebé, autoría y hora siempre explícito.
- Proteger los datos familiares mediante permisos y privacidad por defecto.
- Presentar información sanitaria descriptiva sin convertirla en consejo médico.

## Accessibility & Inclusion

Los controles deben funcionar con teclado, lector de pantalla y objetivos táctiles adecuados. La interfaz debe conservar contraste y legibilidad en tema claro y oscuro, adaptarse a web y aplicaciones nativas y no depender únicamente del color para comunicar estado o significado.
