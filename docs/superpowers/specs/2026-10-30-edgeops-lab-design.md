# EdgeOps Lab — Diseño

## Intención

Construir un laboratorio público y reproducible que demuestre patrones AWS/serverless sin una cuenta de AWS ni costos: una aplicación de operaciones envía eventos sintéticos a una cola, los procesa de manera asíncrona y muestra su estado y evidencia resultante.

## Objetivos

- Ejecutarse en una Raspberry Pi Ubuntu ARM64 con Docker Compose, sin afectar la home existente en el puerto 3001.
- Exponer solo el panel en la LAN por el puerto 3002; LocalStack no expone su API al host.
- Emular SQS, Lambda, DynamoDB y S3 mediante LocalStack.
- Declarar todos los recursos AWS-compatible con Terraform.
- Incluir pruebas unitarias e integración reproducible en GitHub Actions.
- Usar datos sintéticos y documentar la arquitectura, los límites y la migración futura a AWS.

## No objetivos

- No desplegar en AWS ni declarar una operación productiva en AWS.
- No requerir tarjeta, credenciales AWS, acceso a Internet entrante ni datos personales.
- No modificar los contenedores, redes, datos o el puerto 3001 del homelab existente.
- No incorporar Grafana, Caddy, Portainer o más servicios durante el MVP.

## Alcance funcional

El dashboard permite crear un evento sintético con tipo y correlación. La API publica el evento en SQS. Una Lambda consume mensajes, marca su estado en DynamoDB y archiva una evidencia JSON en S3. El dashboard consulta la API para listar eventos y sus estados `queued`, `processed` o `failed`, y expone health checks de la API y LocalStack.

## Arquitectura

`dashboard` sirve la interfaz estática y llama a `api`. La API y las Lambdas usan AWS SDK v3. `localstack` emula servicios AWS dentro de una red Compose privada y ejecuta Lambdas mediante el socket Docker. Terraform aplica los recursos al endpoint de LocalStack. Solo `dashboard:3002` se publica en el host. Los recursos y datos de LocalStack se persisten en un volumen nombrado, y los logs se rotan con límites de tamaño.

## Decisiones

| Alternativa | Decisión | Motivo |
| --- | --- | --- |
| AWS real | No para el MVP | La cuenta solicita tarjeta; el laboratorio debe funcionar sin costo ni credenciales. |
| LocalStack | Sí | Mantiene APIs, SDK y flujo Terraform compatibles con AWS. |
| Completar homelab | No para el MVP | La microSD tiene 11 GB libres y no hay swap; se prioriza una demostración pequeña. |
| Puerto publicado | 3002 | El 3001 pertenece a Homepage y no debe modificarse. |

## Restricciones

- Raspberry Pi: Ubuntu ARM64, Docker 29.7.2 y Compose 5.4.0.
- MicroSD: 11 GB libres al relevamiento; servicios y logs deben mantenerse acotados.
- Las Lambdas usan Node.js 24 y arquitectura `arm64` en la Raspberry.
- El README debe nombrar a LocalStack como emulador y no afirmar despliegue en AWS.

## Entregables

Un repositorio TypeScript con Docker Compose, Terraform, dashboard, API, Lambda, tests, workflow CI y documentación de ejecución, arquitectura y limpieza. El despliegue en la Raspberry ocurrirá únicamente después de revisar el Compose y verificar espacio libre.
