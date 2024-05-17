# 2024-1 / IIC2173 - E0 | Flight Lists Async

***Fecha de entrega:** 31/03/2024*

## Consideraciones Generakes

El backend de este proyecto fue desarrollado en Node js con Express y la conexión al brocker con Javascript, esta echo para ser ejecutado en un entorno AWS EC2 con Ubuntu 20.04. Se dockerizo la aplicación y se utilizo Nginx para balancear la carga. 

Por el lado del frontend, este fue desarrollado con React.js, con la opción de exportar un build para ser guardado en un bucket S3, y ser distribuido mediante CloudFront. Para el manejo de sesión se utiliza Auth0, que permite registrarse, iniciar sesión, que se tengan componentes que requieren sesión activa, y el envío de tokens al realizar llamadas a la API.

Además, se tiene una ApiGateway configurada para el backend contenida en un cloudfront al cual se le asigno el subdominio api.e0valeramirez.tech con sus respectivos certificados ACM.

Todos los requisitos tanto funcionales como no funcionales fueron implementados (Todos los requisitos de la E0 tambien estan completados pero no se enumeran ya que esta se corrigio previamente). A continuación de enumeran uno a uno.

## Requisitos funcionales

✔ Los usuarios pueden registrarse en la plataforma con datos de contacto un correo electrónico (implementado con Auth0)

✔ Los usuario pueden ver la lista de vuelos disponibles dado un filtro de búsqueda sobre los destinos y la fecha. La lista se encuentra paginada. 

✔ Se puede ver el detalle de cada vuelo, incluyendo la cantidad de pasajes disponibles y entrega la opción de compra.

✔ Cuando un usuario hace una solicitud de compra se obtiene la ubicación de este a traves de su IP. Esto se puede observar en el registro de compras del usuario. 

✔ El usuario puede ver sus pasajes comprados y el estado de sus solicitudes.

✔ Cuando se compra un pasaje se envia la solicitud por el canal flight/requests y se espera la respuesta de si es válida en el canal flights/validation

✔ Siempre se esta escuchando el canal flights/requests y flights/validation a traves del mqtt client. 

✔ Los vuelos por defecto tienen 90 pasajes disponibles. 

## Requisitos no funcionales

✔ Se utiliza un formato Backend-Frontend separado: Hay una api con respuestas JSON y un frontend. Se encuentran en dos repositorios separados. 

✔ Las aplicaciones de backend estan cada una en un container distinto: app, mqtt-client y bdd. Además, ya que esta implementado el balanceo de carga hay una copia de app llamada app2 que funcionan sincronizadamente. 

✔ Estan configuradas las Budget alerts en la cuenta de AWS. 

✔ La api se encuentra detrás de una AWS API gateway tipo REST, con los endoints declarados en esta. Además, esta asociado a un subdominio llamado api.e0valeramirez.tech y tiene CORS correctamente configurado. 

✔ Tanto el frontend como backend utilizan HTTPS

✔ Se implemento un servicio de autenticación, en este caso Auth0.

✔ El frontend esta desplegado en S3 con una distrbución Cloudfront

✔ La API Gateway usa el servicio Auth0 a través de un Custon Authorizer (Que utiliza una Lambda function).

✔ Se implemento un pipeline de CI en GithubActions. Esta corre una serie de test implementados en el código carpeta /test, además de un linter que revisa el cumplimiento y sintaxis del código basándose en el estilo ‘Airbnb’.

## Documentación

✔ Se adjunta en este mismo repositorio el diagrama UML de componentes de la entrega. (En la carpeta docs)

✔ Se adjunta la documentación en este mismo repositorio para replicar el pipe CI. (En la carpeta docs)

✔ Los pasos para correr la aplicación en ambiente local se indican a continuación.

## Pasos para levantar el front en local:

**Yarn**

**Ejecución**

Se debe descargar el repositorio y ejecutar

```
yarn install
yarn start
```

La aplicación estará disponible en el puerto `3002`

**Build**

Para generar un build se deberá ejecutar

```
yarn build
```

Y este quedará en `build/`

**AWS**

* **S3**: [e1-frontend.s3-website-us-east-1.amazonaws.com](http://e1-frontend.s3-website-us-east-1.amazonaws.com/)
* **CloudFront**: [d64yivp4x537k.cloudfront.net](https://d64yivp4x537k.cloudfront.net/), [web.vjimenezs.click](https://web.vjimenezs.click/)
* **Certificate Manager**: Su uso en conjunto con CloudFront (con la opción de redirigir de `HTTP` a `HTTPS`) hacen que el *frontend* utilice `HTTPS`

**AWS CLI**

```
aws s3 sync build/ s3://e1-frontend --delete
aws cloudfront create-invalidation --distribution-id E1LIHXT6YVEM2A --paths "/*"
aws cloudfront get-invalidation --id INVALIDATION_ID --distribution-id E1LIHXT6YVEM2A
```

**Config**

* `src/auth_config.json`: Se encuentra las constantes para el uso de `Auth0`
* `src/apiConfig.js`: Se encuentra el *url* a la api `api.e0valeramirez.tech` y los endpoints utilizados

**Errores**

```
fatal error: An error occurred (RequestTimeTooSkewed) when calling the ListObjectsV2 operation: The difference between the request time and the current time is too large.
```

Fix:

```
sudo ntpdate pool.ntp.org
```

## Pasos para levantar el back en local:

* Clonar el repositorio de back (en el que estamos aquí)
* Tener un superuser en postgres
* Crear manualmente con ese superuser la base de datos Entrega0
* Crear el archivo .env con las siguientes variables (DB_USER y DB_PASSWORD son las credenciales para tu superuser)

DB_USER = SUPERUSER
DB_PASSWORD = PASSWORD
DB_NAME = entrega0
DB_HOST = db
DB_PORT = 5432
HOST=broker.iic2173.org
PORT=9000
USER=students
PASSWORD=iic2173-2024-1-students
PORT1= 3000
PORT2= 3001

* Cambiar la linea 10 en models/info_flights.js y models/requests.js, en esta linea viene esto:

const sequelize = new Sequelize('postgres://valeeramirez:vale123@db:5432/entrega0');

Hay que cambiarlo por esto (con las variables de tu superuser, las mismas que se ponen en el .env):

const sequelize = new Sequelize('postgres://SUPERUSER:PASSWORD@db:5432/entrega0');

* Correr (estando dentro del repositorio):

```
docker compose build
```

* Correr:
```
docker compose up
```

## Otros

* Dominio front: https://web.vjimenezs.click/

* Dominio back: https://api.e0valeramirez.tech

