#!/bin/bash

# --- Cores para o Terminal ---
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sem Cor

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}      Spoint Play Hub - Assistente de Deploy       ${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "Esse script vai fazer o deploy usando o seu login atual da gcloud e firebase.\n"

# 1. Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Erro: 'gcloud' (Google Cloud SDK) não está instalado ou não está no seu PATH.${NC}"
    echo "Por favor, instale o Google Cloud SDK antes de continuar."
    exit 1
fi

# 2. Verificar se firebase-tools está instalado ou usar npx
FIREBASE_CMD="firebase"
if ! command -v firebase &> /dev/null; then
    echo -e "${YELLOW}Aviso: 'firebase' global não foi encontrado. Tentando usar via 'npx firebase-tools'...${NC}"
    if ! command -v npx &> /dev/null; then
        echo -e "${RED}Erro: 'npx' não encontrado. Por favor, instale o Node.js/npm.${NC}"
        exit 1
    fi
    FIREBASE_CMD="npx firebase-tools"
fi

# 3. Perguntar as configurações básica
echo -e "${YELLOW}Por favor, confirme as informações do seu projeto no GCP/Firebase:${NC}"
read -p "Digite o ID do Projeto GCP/Firebase: " PROJECT_ID
read -p "Digite a região de deploy do Cloud Run (padrão: us-central1): " REGION
REGION=${REGION:-us-central1}

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}O ID do projeto é obrigatório.${NC}"
    exit 1
fi

# Garantir que gcloud está apontando para o projeto correto
echo -e "\n${BLUE}[1/5] Configurando projeto na gcloud...${NC}"
gcloud config set project $PROJECT_ID

# --- MENU DE DEPLOY ---
echo -e "\n${YELLOW}O que você deseja implantar hoje?${NC}"
echo "1) Tudo (Backend, Frontend e Regras Firebase)"
echo "2) Apenas o Backend (Express API)"
echo "3) Apenas o Frontend (TanStack Start)"
echo "4) Apenas as regras e índices do Firebase"
read -p "Escolha uma opção (1-4): " DEPLOY_OPTION

deploy_backend() {
    echo -e "\n${BLUE}🚀 Iniciando Deploy do BACKEND...${NC}"
    
    # Criar repositório no Artifact Registry se não existir
    echo "Garantindo que o repositório de imagens existe no Artifact Registry..."
    gcloud artifacts repositories create spoint-repo \
        --repository-format=docker \
        --location=$REGION \
        --description="Spoint Docker images" \
        --quiet 2>/dev/null || true

    IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/spoint-repo/spoint-backend:latest"
    
    echo -e "Enviando código do backend para o Google Cloud Build e compilando imagem..."
    gcloud builds submit --tag $IMAGE_TAG ./backend

    echo -e "Publicando container no Google Cloud Run..."
    gcloud run deploy spoint-backend \
        --image $IMAGE_TAG \
        --region $REGION \
        --platform managed \
        --allow-unauthenticated
}

deploy_frontend() {
    echo -e "\n${BLUE}🚀 Iniciando Deploy do FRONTEND...${NC}"
    
    # Criar repositório no Artifact Registry se não existir
    echo "Garantindo que o repositório de imagens existe no Artifact Registry..."
    gcloud artifacts repositories create spoint-repo \
        --repository-format=docker \
        --location=$REGION \
        --description="Spoint Docker images" \
        --quiet 2>/dev/null || true

    IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/spoint-repo/spoint-frontend:latest"
    
    echo -e "Enviando código do frontend para o Google Cloud Build e compilando imagem..."
    gcloud builds submit --tag $IMAGE_TAG .

    echo -e "Publicando container no Google Cloud Run..."
    gcloud run deploy spoint-frontend \
        --image $IMAGE_TAG \
        --region $REGION \
        --platform managed \
        --allow-unauthenticated
}

deploy_firebase() {
    echo -e "\n${BLUE}🚀 Iniciando Deploy das Regras do FIREBASE...${NC}"
    $FIREBASE_CMD deploy --only firestore:rules,firestore:indexes,storage --project $PROJECT_ID
}

case $DEPLOY_OPTION in
    1)
        deploy_backend
        deploy_frontend
        deploy_firebase
        ;;
    2)
        deploy_backend
        ;;
    3)
        deploy_frontend
        ;;
    4)
        deploy_firebase
        ;;
    *)
        echo -e "${RED}Opção inválida.${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}✔ Processo concluído com sucesso!${NC}"
