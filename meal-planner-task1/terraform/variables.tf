variable "aws_region" {
  default = "ap-southeast-1"
}

variable "ami_id" {
  default = "ami-04d7457c43c292911"
}

variable "instance_type" {
  default = "t3.micro"
}

variable "key_pair_name" {
  default = "trainee-rifat-ec2-keypair"
}

variable "vpc_id" {
  default = "vpc-00476759f0c7ee1d5"
}
