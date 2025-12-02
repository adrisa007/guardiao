-- CreateTable
CREATE TABLE "Controladora" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "cnpj" CHAR(14) NOT NULL,
    "nomeFantasia" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Controladora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "controladoraId" TEXT,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" CHAR(11),
    "senhaHash" TEXT NOT NULL,
    "mfaSecret" TEXT,
    "termoConfidAssinado" BOOLEAN NOT NULL DEFAULT false,
    "termoDataAssinatura" TIMESTAMP(3),
    "termoValidade" TIMESTAMP(3),
    "ultimoLogin" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dpo" (
    "usuarioId" TEXT NOT NULL,
    "certificacao" TEXT,

    CONSTRAINT "Dpo_pkey" PRIMARY KEY ("usuarioId")
);

-- CreateTable
CREATE TABLE "ColaboradorInterno" (
    "usuarioId" TEXT NOT NULL,
    "departamento" TEXT,

    CONSTRAINT "ColaboradorInterno_pkey" PRIMARY KEY ("usuarioId")
);

-- CreateTable
CREATE TABLE "Titular" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "cpf" CHAR(11) NOT NULL,
    "dataNascimento" TIMESTAMP(3),
    "menorIdade" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Titular_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prestador" (
    "id" TEXT NOT NULL,
    "controladoraId" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "cnpj" CHAR(14) NOT NULL,
    "escopoTratamento" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "statusAprovacao" TEXT NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "Prestador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuncionarioPrestador" (
    "id" TEXT NOT NULL,
    "prestadorId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "termoSolidarioAssinado" BOOLEAN NOT NULL DEFAULT false,
    "dataAssinatura" TIMESTAMP(3),

    CONSTRAINT "FuncionarioPrestador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaseLegal" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "artigo" TEXT NOT NULL,
    "inciso" TEXT,
    "descricao" TEXT NOT NULL,
    "exigeComprovante" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BaseLegal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoConsentimento" (
    "id" TEXT NOT NULL,
    "controladoraId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "baseLegalPadrao" TEXT,
    "prazoRetencaoMeses" INTEGER,
    "justificativaRetencao" TEXT,
    "anonimizarApos" BOOLEAN NOT NULL DEFAULT false,
    "eliminarApos" BOOLEAN NOT NULL DEFAULT true,
    "exigeProvaFisica" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoConsentimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consentimento" (
    "id" TEXT NOT NULL,
    "titularId" TEXT NOT NULL,
    "colaboradorId" TEXT,
    "tipoConsentimentoId" TEXT,
    "baseLegalId" TEXT NOT NULL,
    "canalColeta" TEXT,
    "classificacaoDados" TEXT[],
    "documentosSolicitados" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "localArmazenamento" TEXT,
    "anexoProva" TEXT,
    "dataColeta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataRevogacao" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Consentimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DsarRequest" (
    "id" TEXT NOT NULL,
    "titularId" TEXT NOT NULL,
    "tipoDireito" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "dataSolicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataResposta" TIMESTAMP(3),

    CONSTRAINT "DsarRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DescarteDados" (
    "id" TEXT NOT NULL,
    "titularId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "dataAgendada" TIMESTAMP(3),
    "dataExecucao" TIMESTAMP(3),
    "metodo" TEXT,
    "hashComprovante" TEXT,

    CONSTRAINT "DescarteDados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidenteSeguranca" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "controladoraId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataDescoberta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataIncidente" TIMESTAMP(3),
    "classificacaoRisco" TEXT NOT NULL,
    "categoriasDados" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'IDENTIFICADO',
    "responsavelRegistroId" TEXT NOT NULL,
    "encarregadoDpoId" TEXT,
    "comunicadoAnpd" BOOLEAN NOT NULL DEFAULT false,
    "comunicadoTitulares" BOOLEAN NOT NULL DEFAULT false,
    "anexos" TEXT[],
    "hashIncidente" TEXT NOT NULL,

    CONSTRAINT "IncidenteSeguranca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RipdDpia" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "controladoraId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricaoTratamento" TEXT NOT NULL,
    "categoriasDados" TEXT[],
    "riscoResidual" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "elaboradorId" TEXT NOT NULL,
    "aprovadorId" TEXT,
    "dataAprovacao" TIMESTAMP(3),
    "revisaoAnual" TIMESTAMP(3),
    "anexos" TEXT[],
    "hashRipd" TEXT NOT NULL,

    CONSTRAINT "RipdDpia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermoConfidencialidade" (
    "id" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "tipoUsuario" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "hashConteudo" TEXT NOT NULL,
    "dataPublicacao" TIMESTAMP(3) NOT NULL,
    "dataExpiracao" TIMESTAMP(3),
    "responsabilidadeSolidaria" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TermoConfidencialidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssinaturaTermo" (
    "id" TEXT NOT NULL,
    "termoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "ipAssinatura" TEXT NOT NULL,
    "dataAssinatura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataValidade" TIMESTAMP(3) NOT NULL,
    "revogado" BOOLEAN NOT NULL DEFAULT false,
    "hashAssinatura" TEXT NOT NULL,

    CONSTRAINT "AssinaturaTermo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogConsultaPrestadorCnpj" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "cnpjConsultado" CHAR(14) NOT NULL,
    "prestadorEncontrado" BOOLEAN NOT NULL,
    "prestadorId" TEXT,
    "statusContrato" TEXT,
    "percentualFuncionariosOk" INTEGER,
    "ipConsulta" TEXT NOT NULL,
    "dataConsulta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hashRegistro" TEXT NOT NULL,

    CONSTRAINT "LogConsultaPrestadorCnpj_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditoriaGlobal" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tabelaAfetada" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "dadosAntes" JSONB,
    "dadosDepois" JSONB,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hashRegistro" TEXT NOT NULL,

    CONSTRAINT "AuditoriaGlobal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Controladora_cnpj_key" ON "Controladora"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Titular_usuarioId_key" ON "Titular"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Titular_cpf_key" ON "Titular"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "FuncionarioPrestador_usuarioId_key" ON "FuncionarioPrestador"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "BaseLegal_codigo_key" ON "BaseLegal"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "TipoConsentimento_codigo_key" ON "TipoConsentimento"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "DsarRequest_protocolo_key" ON "DsarRequest"("protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "IncidenteSeguranca_protocolo_key" ON "IncidenteSeguranca"("protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "IncidenteSeguranca_hashIncidente_key" ON "IncidenteSeguranca"("hashIncidente");

-- CreateIndex
CREATE UNIQUE INDEX "RipdDpia_protocolo_key" ON "RipdDpia"("protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "RipdDpia_hashRipd_key" ON "RipdDpia"("hashRipd");

-- CreateIndex
CREATE UNIQUE INDEX "TermoConfidencialidade_hashConteudo_key" ON "TermoConfidencialidade"("hashConteudo");

-- CreateIndex
CREATE UNIQUE INDEX "AssinaturaTermo_hashAssinatura_key" ON "AssinaturaTermo"("hashAssinatura");

-- CreateIndex
CREATE UNIQUE INDEX "AssinaturaTermo_usuarioId_termoId_key" ON "AssinaturaTermo"("usuarioId", "termoId");

-- CreateIndex
CREATE UNIQUE INDEX "LogConsultaPrestadorCnpj_hashRegistro_key" ON "LogConsultaPrestadorCnpj"("hashRegistro");

-- CreateIndex
CREATE UNIQUE INDEX "AuditoriaGlobal_hashRegistro_key" ON "AuditoriaGlobal"("hashRegistro");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_controladoraId_fkey" FOREIGN KEY ("controladoraId") REFERENCES "Controladora"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dpo" ADD CONSTRAINT "Dpo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColaboradorInterno" ADD CONSTRAINT "ColaboradorInterno_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Titular" ADD CONSTRAINT "Titular_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestador" ADD CONSTRAINT "Prestador_controladoraId_fkey" FOREIGN KEY ("controladoraId") REFERENCES "Controladora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuncionarioPrestador" ADD CONSTRAINT "FuncionarioPrestador_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "Prestador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuncionarioPrestador" ADD CONSTRAINT "FuncionarioPrestador_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoConsentimento" ADD CONSTRAINT "TipoConsentimento_controladoraId_fkey" FOREIGN KEY ("controladoraId") REFERENCES "Controladora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoConsentimento" ADD CONSTRAINT "TipoConsentimento_baseLegalPadrao_fkey" FOREIGN KEY ("baseLegalPadrao") REFERENCES "BaseLegal"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consentimento" ADD CONSTRAINT "Consentimento_titularId_fkey" FOREIGN KEY ("titularId") REFERENCES "Titular"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consentimento" ADD CONSTRAINT "Consentimento_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consentimento" ADD CONSTRAINT "Consentimento_tipoConsentimentoId_fkey" FOREIGN KEY ("tipoConsentimentoId") REFERENCES "TipoConsentimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consentimento" ADD CONSTRAINT "Consentimento_baseLegalId_fkey" FOREIGN KEY ("baseLegalId") REFERENCES "BaseLegal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DsarRequest" ADD CONSTRAINT "DsarRequest_titularId_fkey" FOREIGN KEY ("titularId") REFERENCES "Titular"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescarteDados" ADD CONSTRAINT "DescarteDados_titularId_fkey" FOREIGN KEY ("titularId") REFERENCES "Titular"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenteSeguranca" ADD CONSTRAINT "IncidenteSeguranca_controladoraId_fkey" FOREIGN KEY ("controladoraId") REFERENCES "Controladora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenteSeguranca" ADD CONSTRAINT "IncidenteSeguranca_responsavelRegistroId_fkey" FOREIGN KEY ("responsavelRegistroId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RipdDpia" ADD CONSTRAINT "RipdDpia_controladoraId_fkey" FOREIGN KEY ("controladoraId") REFERENCES "Controladora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RipdDpia" ADD CONSTRAINT "RipdDpia_elaboradorId_fkey" FOREIGN KEY ("elaboradorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssinaturaTermo" ADD CONSTRAINT "AssinaturaTermo_termoId_fkey" FOREIGN KEY ("termoId") REFERENCES "TermoConfidencialidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssinaturaTermo" ADD CONSTRAINT "AssinaturaTermo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogConsultaPrestadorCnpj" ADD CONSTRAINT "LogConsultaPrestadorCnpj_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogConsultaPrestadorCnpj" ADD CONSTRAINT "LogConsultaPrestadorCnpj_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "Prestador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditoriaGlobal" ADD CONSTRAINT "AuditoriaGlobal_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
