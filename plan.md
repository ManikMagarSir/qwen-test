# Manik Cloud - Development Roadmap
**Version:** 1.0
**Status:** Planning
**Goal:** Build a production-ready cloud platform similar to DigitalOcean/Linode powered by Proxmox while hiding the underlying infrastructure from customers.

---

# Vision

Manik Cloud is **not** a Proxmox dashboard.

It is a cloud platform where users can create and manage infrastructure without ever knowing Proxmox exists.

The platform should eventually support:

- Virtual Machines
- LXC Containers
- Private Networks (VPC)
- Firewalls
- Floating IPs
- Volumes
- Snapshots
- Images
- Backups
- Projects
- Teams
- API Keys
- Billing
- Monitoring

---

# Development Philosophy

Build from the bottom up.

Never build UI before the backend is capable.

Order of priority:

Infrastructure
→ Automation
→ API
→ Security
→ Database
→ Frontend

---

# Phase 0 - Learn the Infrastructure

Goal:
Understand how a cloud actually works.

Topics

- Linux Administration
- KVM
- QEMU
- LXC
- Cloud-init
- SSH
- Linux Networking
- Bridges
- VLANs
- VXLAN
- NAT
- iptables / nftables
- DNS
- DHCP
- Storage
- LVM
- ZFS
- Ceph (basic understanding)

Deliverables

- Create VM manually
- Create LXC manually
- Create Linux bridge
- Attach VM to bridge
- Configure cloud-init
- Assign static IP
- SSH successfully

Completion Criteria

Everything can be created manually without using the GUI.

---

# Phase 1 - Infrastructure Automation

Goal

Everything should be executable from scripts.

Language

Python or Go

Automation

Create VM

Delete VM

Start VM

Stop VM

Restart VM

Clone VM

Create LXC

Delete LXC

Resize Disk

Resize RAM

Assign Network

Generate SSH Keys

Cloud-init Configuration

Backup

Restore

Snapshot

Destroy

Deliverables

scripts/

create_vm.py

delete_vm.py

snapshot.py

restore.py

resize.py

network.py

backup.py

Success

No GUI required.

Everything works from CLI.

---

# Phase 2 - Core Backend

Stack

NestJS

PostgreSQL

Prisma

Redis

BullMQ

JWT

Responsibilities

Authentication

Authorization

User Management

Project Management

VM Management

Task Queue

Audit Logs

Database

API Documentation

Success

Backend can manage infrastructure without frontend.

---

# Phase 3 - Database Design

Entities

User

Project

Team

API Key

Virtual Machine

LXC

Image

Snapshot

Backup

Volume

Firewall

Network

VPC

SSH Key

Audit Log

Task

Future

Billing

Invoice

Payment

Coupons

Plans

---

# Phase 4 - Networking

Goal

Create cloud networking.

Features

Private Network

Virtual Switch

NAT

Floating IP

Firewall Rules

Security Groups

DHCP

DNS

Bandwidth Limits

Traffic Monitoring

Future

Load Balancer

VPN Gateway

VXLAN

---

# Phase 5 - Storage

Storage Types

Root Disk

Volumes

ISO

Templates

Backups

Snapshots

Storage Providers

Local-LVM

ZFS

Ceph

NFS

Future

S3 Compatible Object Storage

---

# Phase 6 - Security

Authentication

JWT

Refresh Tokens

OTP

2FA

Role-Based Access Control

Permissions

Admin

Support

Developer

Customer

Audit Logging

API Rate Limiting

Encryption

Secrets

Hashing

Session Management

IP Allow Lists

Security Headers

CORS

Input Validation

SQL Injection Protection

XSS Protection

CSRF Protection

---

# Phase 7 - Public REST API

Endpoints

POST /v1/vms

DELETE /v1/vms/{id}

PATCH /v1/vms/{id}

GET /v1/vms

POST /v1/snapshots

POST /v1/backups

POST /v1/networks

POST /v1/firewalls

POST /v1/volumes

POST /v1/images

POST /v1/projects

POST /v1/keys

Future

GraphQL

Terraform Provider

CLI

SDK

---

# Phase 8 - Frontend

Stack

Next.js

React

TailwindCSS

shadcn/ui

Framer Motion

Pages

Landing

Authentication

Dashboard

Projects

VMs

Networks

Volumes

Snapshots

Backups

Firewall

Monitoring

Billing

Settings

API Keys

Profile

Team Management

---

# Phase 9 - Monitoring

Metrics

CPU

RAM

Disk

Network

Bandwidth

IOPS

Temperature (future)

Alerts

CPU Usage

RAM Usage

Disk Full

Node Offline

Backup Failed

Future

Grafana

Prometheus

Loki

OpenTelemetry

---

# Phase 10 - Multi-Node Cluster

Features

Multiple Proxmox Nodes

Scheduler

Node Selection

High Availability

Migration

Replication

Cluster Monitoring

Future

Auto Scheduler

Auto Scaling

---

# Phase 11 - Billing

Plans

Free

Starter

Professional

Enterprise

Features

Usage Tracking

Invoices

Subscriptions

Coupons

Taxes

Overages

Stripe Integration

PayPal

Future

Crypto Payments

---

# Phase 12 - Marketplace

Users can deploy

Ubuntu

Debian

Rocky Linux

Fedora

Windows

Docker Host

Kubernetes

WordPress

GitLab

Nextcloud

MikroTik CHR

pfSense

OpenVPN

One Click Deployments

---

# Phase 13 - Advanced Features

VPC

VPN

Floating IP

Private DNS

Managed Database

Managed Redis

Managed Kubernetes

GPU Instances

Object Storage

Container Registry

Functions

Serverless

Autoscaling

---

# Folder Structure

manik-cloud/

├── backend/
├── frontend/
├── infrastructure/
├── scripts/
├── workers/
├── gateway/
├── monitoring/
├── docs/
├── docker/
├── terraform/
├── kubernetes/
├── storage/
└── api/

---

# Recommended Milestones

Milestone 1

✔ Install Proxmox

✔ Create VM via API

✔ Delete VM

✔ Start VM

✔ Stop VM

✔ Database stores VM

---

Milestone 2

✔ Authentication

✔ Dashboard

✔ Project Management

✔ SSH Keys

✔ Templates

---

Milestone 3

✔ Snapshots

✔ Backups

✔ Firewall

✔ Networks

✔ Volumes

---

Milestone 4

✔ Multi-node Support

✔ Scheduler

✔ Monitoring

✔ API Keys

✔ CLI

---

Milestone 5

✔ Billing

✔ Marketplace

✔ Managed Services

✔ Public API

---

# Final Goal

Build a cloud platform where:

- Users never interact with Proxmox directly.
- Every infrastructure action goes through Manik Cloud's backend.
- The backend enforces quotas, permissions, and security.
- The frontend is only a client of the backend API.
- The platform can evolve from a single Proxmox host to a multi-node cloud without major architectural changes.

**Rule of Thumb:** If a feature only makes the UI look better but doesn't improve the platform's core capabilities, postpone it. A reliable provisioning engine, API, and security model are more valuable than animations or visual polish.