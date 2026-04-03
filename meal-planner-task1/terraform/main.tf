terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}


data "aws_security_group" "existing_sg" {
  id = "sg-0e7027bee40cdc75d"
}


resource "aws_instance" "backend" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  key_name                    = var.key_pair_name
  vpc_security_group_ids      = [data.aws_security_group.existing_sg.id]
  associate_public_ip_address = true

  user_data = file("user_data.sh")

  tags = {
    Name = "trainee-rifat-ec2-instance-3-terraform"
  }
}
