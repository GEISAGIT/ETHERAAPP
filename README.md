# Welcome to Antigravity!

Welcome to your new developer home! Your Firebase Studio project has been successfully migrated to Antigravity.

Antigravity is our next-generation, agent-first IDE designed for high-velocity, autonomous development. Because Antigravity runs locally on your machine, you now have access to powerful local workflows and fully integrated AI editing capabilities that go beyond a cloud-based web IDE.

## Getting Started
- **Run Locally**: Use the **Run and Debug** menu on the left sidebar to start your local development server.
  - Or in a terminal run `npm run dev` and visit `http://localhost:9002`.
- **Deploy**: You can deploy your changes to Firebase App Hosting by using the integrated terminal and standard Firebase CLI commands, just as you did in Firebase Studio.
- **Cleanup**: Cleanup unused artifacts with the @cleanup workflow.

Enjoy the next era of AI-driven development!

File any bugs at https://github.com/firebase/firebase-tools/issues

**Firebase Studio Export Date:** 2026-03-23


---

## Previous README.md contents:

# Firebase Studio - Ethera

Este é o portal administrativo da Ethera.

## Configuração de CORS (Importante!)

Para que o upload de fotos e documentos funcione corretamente, você **PRECISA** rodar o comando abaixo no terminal do Cloud Workstation para liberar o acesso ao Storage:

```bash
gsutil cors set cors.json gs://clinicflow-api-banc-3871-3813b.appspot.com
```

*Nota: Se o bucket for diferente, você pode encontrar o nome correto no console do Firebase Storage ou nas mensagens de erro do console do navegador.*

## Estrutura do Projeto

- `/hr`: Módulo de Recursos Humanos (Cadastro, Controle de Funcionários e Ponto).
- `/transactions`: Gestão financeira.
- `/api-bank`: Integração com a conta Cora.
- `/user-management`: Controle de acesso e permissões.