# Configuración inicial para el proyecto GESTIÓN DE TAREAS (TO-DO)

Tecnologías utilizadas:
- Frontend: ReactJS con Vite
- Backend: NodeJS con Express
- Base de datos: MariaDB
- ORM: Prisma 

----------------------------------------------
-- Requerimientos para ejecutar el proyecto --
----------------------------------------------

1. Verificar que se disponga de MariaDB (Versión utilizada para este proyecto 10.11.15)


2. Crear la base de datos, se adjunta script para MARIADB:

    CREATE DATABASE IF NOT EXISTS `todo_app` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    USE `todo_app`;

    SET NAMES utf8mb4;
    SET FOREIGN_KEY_CHECKS = 0;

    DROP TABLE IF EXISTS `tasks`;
    CREATE TABLE `tasks`  (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
    `status` enum('pending','in_progress','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
    `dueDate` datetime(3) NULL DEFAULT NULL,
    `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
    `updatedAt` datetime(3) NOT NULL,
    PRIMARY KEY (`id`) USING BTREE
    ) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

    SET FOREIGN_KEY_CHECKS = 1;



3. Busca el archivo .env.example en la ruta:
    backEnd/.env.example
    Edita su contenido con el usuario y contraseña de la instancia de MARIADB que utilices, finalmente renombra el archivo para que te quede así: .env


4. Descarga el archivo excel de prueba, tasks.xlsx que se encuentra en la raíz del proyecto.


5. Desde el cmd Navega al directorio `backend/` del proyecto y ejecuta lo siguiente:
    5.1. npm install 
    5.2. npx prisma migrate deploy 
    5.3. npm run dev

