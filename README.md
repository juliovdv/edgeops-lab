# EdgeOps Lab

AWS-compatible edge operations lab for synthetic event processing. It uses LocalStack to emulate AWS services locally; it is not deployed on AWS and does not require AWS credentials.

The MVP will run on a Raspberry Pi with Docker Compose and expose only a LAN dashboard on port 3002. It demonstrates SQS, Lambda, DynamoDB, S3, Terraform, typed contracts and integration testing without modifying the existing homelab services.

## Development

```bash
source /home/juliovdv/.nvm/nvm.sh
nvm use 24
npm install
npm test
npm run typecheck
```

See [the design](docs/superpowers/specs/2026-10-30-edgeops-lab-design.md) and [implementation plan](docs/superpowers/plans/2026-10-30-edgeops-lab.md).
