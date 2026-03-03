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