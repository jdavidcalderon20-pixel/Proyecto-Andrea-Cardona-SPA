-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
-- -----------------------------------------------------
-- Schema juanandreacardonaspa
-- -----------------------------------------------------
DROP SCHEMA IF EXISTS `juanandreacardonaspa` ;

-- -----------------------------------------------------
-- Schema juanandreacardonaspa
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `juanandreacardonaspa` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci ;
USE `juanandreacardonaspa` ;

-- -----------------------------------------------------
-- Table `cliente`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `cliente` ;

CREATE TABLE IF NOT EXISTS `cliente` (
  `id_cliente` INT NOT NULL AUTO_INCREMENT,
  `nombres` VARCHAR(100) NOT NULL,
  `apellidos` VARCHAR(100) NOT NULL,
  `telefono` VARCHAR(20) NULL DEFAULT NULL,
  `email` VARCHAR(100) NULL DEFAULT NULL,
  `fecha_registro` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cliente`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `servicio`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `servicio` ;

CREATE TABLE IF NOT EXISTS `servicio` (
  `id_servicio` INT NOT NULL AUTO_INCREMENT,
  `nombre_servicio` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL DEFAULT NULL,
  `precio` DECIMAL(10,2) NOT NULL,
  `duracion_minutos` INT NOT NULL,
  `estado` TINYINT(1) NULL DEFAULT '1',
  PRIMARY KEY (`id_servicio`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `terapeuta`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `terapeuta` ;

CREATE TABLE IF NOT EXISTS `terapeuta` (
  `id_terapeuta` INT NOT NULL AUTO_INCREMENT,
  `nombres` VARCHAR(100) NOT NULL,
  `especialidad` VARCHAR(50) NULL DEFAULT NULL,
  `telefono` VARCHAR(20) NULL DEFAULT NULL,
  `estado` VARCHAR(20) NULL DEFAULT 'Disponible',
  PRIMARY KEY (`id_terapeuta`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `cita`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `cita` ;

CREATE TABLE IF NOT EXISTS `cita` (
  `id_cita` INT NOT NULL AUTO_INCREMENT,
  `fecha` DATE NOT NULL,
  `hora` TIME NOT NULL,
  `estado` VARCHAR(20) NULL DEFAULT 'Pendiente',
  `observaciones` TEXT NULL DEFAULT NULL,
  `id_cliente` INT NULL DEFAULT NULL,
  `id_servicio` INT NULL DEFAULT NULL,
  `id_terapeuta` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id_cita`),
  INDEX `id_cliente` (`id_cliente` ASC),
  INDEX `id_servicio` (`id_servicio` ASC),
  INDEX `id_terapeuta` (`id_terapeuta` ASC),
  CONSTRAINT `cita_ibfk_1`
    FOREIGN KEY (`id_cliente`)
    REFERENCES `cliente` (`id_cliente`),
  CONSTRAINT `cita_ibfk_2`
    FOREIGN KEY (`id_servicio`)
    REFERENCES `servicio` (`id_servicio`),
  CONSTRAINT `cita_ibfk_3`
    FOREIGN KEY (`id_terapeuta`)
    REFERENCES `terapeuta` (`id_terapeuta`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `pago`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `pago` ;

CREATE TABLE IF NOT EXISTS `pago` (
  `id_pago` INT NOT NULL AUTO_INCREMENT,
  `monto_final` DECIMAL(10,2) NOT NULL,
  `fecha_pago` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `metodo_pago` VARCHAR(50) NULL DEFAULT NULL,
  `id_cita` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id_pago`),
  UNIQUE INDEX `id_cita` (`id_cita` ASC),
  CONSTRAINT `pago_ibfk_1`
    FOREIGN KEY (`id_cita`)
    REFERENCES `cita` (`id_cita`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `usuario`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `usuario` ;

CREATE TABLE IF NOT EXISTS `usuario` (
  `id_usuario` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `rol` VARCHAR(20) NOT NULL,
  `estado` TINYINT(1) NULL DEFAULT '1',
  PRIMARY KEY (`id_usuario`),
  UNIQUE INDEX `username` (`username` ASC))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
