terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "trainee-rifat-mhpv2-tfstate"
    key    = "meal-planner-task2/terraform.tfstate"
    region = "ap-southeast-1"
  }
}

provider "aws" {
  region = var.aws_region
}
