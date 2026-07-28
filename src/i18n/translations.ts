import { Language } from '../types';

export const translations: Record<Language, Record<string, string>> = {
  pt: {
    // Header & Brand
    'brand.name': 'Company Hero',
    'brand.dashboardTitle': 'Performance & Operations',

    // Login Screen
    'login.welcome': 'Bem-vindo de volta',
    'login.title': 'Acesse sua conta Company Hero',
    'login.subtitle': 'Plataforma integrada de inteligência e performance de atendimento',
    'login.googleButton': 'Entrar com o Google',
    'login.loginPill': 'LOGIN',
    'login.domainRestrictionNotice': 'Acesso restrito a e-mails corporativos autorizados ou domínios liberados.',
    'login.unauthorizedDomainError': 'Erro de e-mail não autorizado: O domínio do seu e-mail não está na lista de domínios corporativos permitidos.',
    'login.firebaseDomainError': 'Domínio de hospedagem (Vercel) não autorizado no Firebase Console! Adicione a URL do seu app em: Firebase Console > Authentication > Settings > Authorized Domains (Domínios Autorizados).',
    'login.inactiveUserError': 'Sua conta está inativa. Entre em contato com o administrador do sistema.',
    'login.generalError': 'Falha ao realizar autenticação. Por favor, tente novamente.',
    'login.heroTagline': 'Excelência e Agilidade no Suporte Corporativo',
    'login.footerCopyright': 'Company Hero. Todos os direitos reservados.',
    'login.selectLanguage': 'Idioma',
    'login.support': 'Suporte Técnico',
    'login.authenticating': 'Autenticando...',

    // Navigation
    'nav.executiveDashboard': 'Painel Executivo',
    'nav.analystPerformance': 'Performance de Analistas',
    'nav.userManagement': 'Gestão de Usuários',
    'nav.logout': 'Sair',
    'nav.profile': 'Meu Perfil',

    // Access Restricted / User Management
    'access.restrictedTitle': 'Acesso Restrito',
    'access.restrictedDescription': 'Você não possui permissão de Administrador para acessar a área de Gestão de Usuários.',
    'access.backToDashboard': 'Voltar ao Dashboard',
    
    // User Management Screen
    'users.title': 'Gestão de Usuários',
    'users.subtitle': 'Gerencie permissões, papéis de acesso e status de usuários da plataforma',
    'users.searchPlaceholder': 'Buscar por nome ou e-mail...',
    'users.colName': 'Usuário',
    'users.colEmail': 'E-mail',
    'users.colRole': 'Papel de Acesso',
    'users.colStatus': 'Status',
    'users.colLastLogin': 'Último Acesso',
    'users.colActions': 'Ações',
    'users.roleAdmin': 'Administrador',
    'users.roleUser': 'Usuário Comum',
    'users.statusActive': 'Ativo',
    'users.statusInactive': 'Inativo',
    'users.activateUser': 'Ativar Usuário',
    'users.deactivateUser': 'Desativar Usuário',
    'users.makeAdmin': 'Tornar Admin',
    'users.makeUser': 'Tornar Usuário Comum',
    'users.totalUsers': 'Total de Usuários',
    'users.activeUsers': 'Usuários Ativos',
    'users.adminUsers': 'Administradores',
    'users.domainSettings': 'Configurações de Domínio Corporativo',
    'users.allowedDomains': 'Domínios Permitidos (separados por vírgula):',
    'users.saveDomainSettings': 'Salvar Configurações',
    'users.settingsUpdated': 'Configurações atualizadas com sucesso!',
    
    // Common UI
    'common.themeLight': 'Modo Claro',
    'common.themeDark': 'Modo Escuro',
    'common.loading': 'Carregando...',
    'common.adminBadge': 'ADMIN',
    'common.userBadge': 'USUÁRIO'
  },
  en: {
    // Header & Brand
    'brand.name': 'Company Hero',
    'brand.dashboardTitle': 'Performance & Operations',

    // Login Screen
    'login.welcome': 'Welcome back',
    'login.title': 'Sign in to your Company Hero account',
    'login.subtitle': 'Integrated intelligence and customer support performance platform',
    'login.googleButton': 'Sign in with Google',
    'login.loginPill': 'LOGIN',
    'login.domainRestrictionNotice': 'Access restricted to authorized corporate emails or permitted domains.',
    'login.unauthorizedDomainError': 'Unauthorized email domain: Your email domain is not in the allowed corporate list.',
    'login.firebaseDomainError': 'Hosting domain (Vercel) not authorized in Firebase Console! Please add your Vercel URL in: Firebase Console > Authentication > Settings > Authorized Domains.',
    'login.inactiveUserError': 'Your account is currently inactive. Please contact your system administrator.',
    'login.generalError': 'Authentication failed. Please try again.',
    'login.heroTagline': 'Excellence and Agility in Corporate Support',
    'login.footerCopyright': 'Company Hero. All rights reserved.',
    'login.selectLanguage': 'Language',
    'login.support': 'Technical Support',
    'login.authenticating': 'Authenticating...',

    // Navigation
    'nav.executiveDashboard': 'Executive Dashboard',
    'nav.analystPerformance': 'Analyst Performance',
    'nav.userManagement': 'User Management',
    'nav.logout': 'Sign Out',
    'nav.profile': 'My Profile',

    // Access Restricted / User Management
    'access.restrictedTitle': 'Restricted Access',
    'access.restrictedDescription': 'You do not have Administrator permissions to access the User Management section.',
    'access.backToDashboard': 'Back to Dashboard',
    
    // User Management Screen
    'users.title': 'User Management',
    'users.subtitle': 'Manage permissions, access roles, and user statuses across the platform',
    'users.searchPlaceholder': 'Search by name or email...',
    'users.colName': 'User',
    'users.colEmail': 'Email',
    'users.colRole': 'Access Role',
    'users.colStatus': 'Status',
    'users.colLastLogin': 'Last Login',
    'users.colActions': 'Actions',
    'users.roleAdmin': 'Administrator',
    'users.roleUser': 'Standard User',
    'users.statusActive': 'Active',
    'users.statusInactive': 'Inactive',
    'users.activateUser': 'Activate User',
    'users.deactivateUser': 'Deactivate User',
    'users.makeAdmin': 'Make Admin',
    'users.makeUser': 'Make Standard User',
    'users.totalUsers': 'Total Users',
    'users.activeUsers': 'Active Users',
    'users.adminUsers': 'Administrators',
    'users.domainSettings': 'Corporate Domain Settings',
    'users.allowedDomains': 'Allowed Domains (comma separated):',
    'users.saveDomainSettings': 'Save Settings',
    'users.settingsUpdated': 'Settings updated successfully!',

    // Common UI
    'common.themeLight': 'Light Mode',
    'common.themeDark': 'Dark Mode',
    'common.loading': 'Loading...',
    'common.adminBadge': 'ADMIN',
    'common.userBadge': 'USER'
  },
  es: {
    // Header & Brand
    'brand.name': 'Company Hero',
    'brand.dashboardTitle': 'Rendimiento y Operaciones',

    // Login Screen
    'login.welcome': 'Bienvenido de nuevo',
    'login.title': 'Inicia sesión en tu cuenta Company Hero',
    'login.subtitle': 'Plataforma integrada de inteligencia y rendimiento de soporte al cliente',
    'login.googleButton': 'Continuar con Google',
    'login.loginPill': 'ACCESO',
    'login.domainRestrictionNotice': 'Acceso restringido a correos corporativos preautorizados o dominio empresarial.',
    'login.unauthorizedDomainError': 'Error de dominio no autorizado: Tu correo no pertenece al dominio corporativo permitido o no está preautorizado.',
    'login.inactiveUserError': 'Tu cuenta está inactiva. Por favor contacta al administrador del sistema.',
    'login.generalError': 'Error de autenticación. Por favor, intentalo de nuevo.',
    'login.heroTagline': 'Excelencia y Agilidad en el Soporte Corporativo',
    'login.footerCopyright': 'Company Hero. Todos los derechos reservados.',
    'login.selectLanguage': 'Idioma',
    'login.support': 'Soporte Técnico',
    'login.authenticating': 'Autenticando...',

    // Navigation
    'nav.executiveDashboard': 'Panel Ejecutivo',
    'nav.analystPerformance': 'Rendimiento de Analistas',
    'nav.userManagement': 'Gestión de Usuarios',
    'nav.logout': 'Cerrar Sesión',
    'nav.profile': 'Mi Perfil',

    // Access Restricted / User Management
    'access.restrictedTitle': 'Acceso Restringido',
    'access.restrictedDescription': 'No tienes permisos de Administrador para acceder a la sección de Gestión de Usuarios.',
    'access.backToDashboard': 'Volver al Panel',
    
    // User Management Screen
    'users.title': 'Gestión de Usuarios',
    'users.subtitle': 'Administra permisos, roles de acceso y estado de los usuarios en la plataforma',
    'users.searchPlaceholder': 'Buscar por nombre o correo...',
    'users.colName': 'Usuario',
    'users.colEmail': 'Correo Electrónico',
    'users.colRole': 'Rol de Acceso',
    'users.colStatus': 'Estado',
    'users.colLastLogin': 'Último Acceso',
    'users.colActions': 'Acciones',
    'users.roleAdmin': 'Administrador',
    'users.roleUser': 'Usuario Estándar',
    'users.statusActive': 'Activo',
    'users.statusInactive': 'Inactivo',
    'users.activateUser': 'Activar Usuario',
    'users.deactivateUser': 'Desactivar Usuario',
    'users.makeAdmin': 'Hacer Admin',
    'users.makeUser': 'Hacer Usuario Estándar',
    'users.totalUsers': 'Total de Usuarios',
    'users.activeUsers': 'Usuarios Activos',
    'users.adminUsers': 'Administradores',
    'users.domainSettings': 'Configuración de Dominio Corporativo',
    'users.allowedDomains': 'Dominios Permitidos (separados por coma):',
    'users.saveDomainSettings': 'Guardar Configuración',
    'users.settingsUpdated': '¡Configuración actualizada con éxito!',

    // Common UI
    'common.themeLight': 'Modo Claro',
    'common.themeDark': 'Modo Oscuro',
    'common.loading': 'Cargando...',
    'common.adminBadge': 'ADMIN',
    'common.userBadge': 'USUARIO'
  }
};
