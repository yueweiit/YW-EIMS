const local: App.I18n.Schema = {
  system: {
    title: 'YUEWEI EIMS',
    updateTitle: 'Notificación de actualización del sistema',
    updateContent: 'Se detectó una nueva versión del sistema. ¿Deseas actualizar la página ahora?',
    updateConfirm: 'Actualizar ahora',
    updateCancel: 'Más tarde'
  },
  common: {
    action: 'Acción',
    add: 'Agregar',
    addSuccess: 'Agregado correctamente',
    backToHome: 'Volver al inicio',
    batchDelete: 'Eliminar seleccionados',
    cancel: 'Cancelar',
    close: 'Cerrar',
    check: 'Seleccionar',
    selectAll: 'Seleccionar todo',
    expandColumn: 'Expandir columna',
    columnSetting: 'Configuración de columnas',
    config: 'Configuración',
    confirm: 'Confirmar',
    delete: 'Eliminar',
    deleteSuccess: 'Eliminado correctamente',
    confirmDelete: '¿Confirmas la eliminación?',
    edit: 'Editar',
    warning: 'Advertencia',
    error: 'Error',
    index: 'N.º',
    keywordSearch: 'Ingresa una palabra clave',
    logout: 'Cerrar sesión',
    logoutConfirm: '¿Confirmas cerrar sesión?',
    lookForward: 'Próximamente',
    modify: 'Modificar',
    modifySuccess: 'Modificado correctamente',
    noData: 'Sin datos',
    operate: 'Operación',
    pleaseCheckValue: 'Verifica que el valor sea válido',
    refresh: 'Actualizar',
    reset: 'Restablecer',
    search: 'Buscar',
    switch: 'Cambiar',
    tip: 'Consejo',
    trigger: 'Activar',
    update: 'Actualizar',
    updateSuccess: 'Actualizado correctamente',
    userCenter: 'Centro de usuario',
    yesOrNo: {
      yes: 'Sí',
      no: 'No'
    }
  },
  request: {
    logout: 'Se cerrará la sesión después de un error en la solicitud',
    logoutMsg: 'El estado del usuario no es válido. Inicia sesión nuevamente',
    logoutWithModal: 'Mostrar una ventana y cerrar sesión después de un error',
    logoutWithModalMsg: 'El estado del usuario no es válido. Inicia sesión nuevamente',
    refreshToken: 'El token solicitado expiró. Se renovará el token',
    tokenExpired: 'El token solicitado expiró'
  },
  theme: {
    themeDrawerTitle: 'Configuración del tema',
    tabs: {
      appearance: 'Apariencia',
      layout: 'Diseño',
      general: 'General',
      preset: 'Preajustes'
    },
    appearance: {
      themeSchema: {
        title: 'Modo de tema',
        light: 'Claro',
        dark: 'Oscuro',
        auto: 'Seguir el sistema'
      },
      grayscale: 'Escala de grises',
      colourWeakness: 'Modo para daltonismo',
      themeColor: {
        title: 'Color del tema',
        primary: 'Primario',
        info: 'Información',
        success: 'Éxito',
        warning: 'Advertencia',
        error: 'Error',
        followPrimary: 'Seguir el color primario'
      },
      themeRadius: {
        title: 'Radio de esquinas'
      },
      recommendColor: 'Aplicar colores recomendados',
      recommendColorDesc: 'Algoritmo utilizado para recomendar colores',
      preset: {
        title: 'Preajustes del tema',
        apply: 'Aplicar',
        applySuccess: 'Preajuste aplicado correctamente',
        default: {
          name: 'Preajuste predeterminado',
          desc: 'Tema equilibrado para uso general'
        },
        dark: {
          name: 'Preajuste oscuro',
          desc: 'Tema oscuro para uso nocturno'
        },
        compact: {
          name: 'Preajuste compacto',
          desc: 'Diseño compacto para pantallas pequeñas'
        },
        azir: {
          name: 'Preajuste de Azir',
          desc: 'Un estilo frío y elegante'
        }
      }
    },
    layout: {
      layoutMode: {
        title: 'Modo de diseño',
        vertical: 'Menú lateral',
        horizontal: 'Menú superior',
        'vertical-mix': 'Menú lateral combinado',
        'vertical-hybrid-header-first': 'Híbrido lateral: encabezado primero',
        'top-hybrid-sidebar-first': 'Híbrido superior: barra lateral primero',
        'top-hybrid-header-first': 'Híbrido superior: encabezado primero',
        vertical_detail: 'Menú lateral a la izquierda y contenido a la derecha.',
        'vertical-mix_detail': 'Menú combinado con primer nivel oscuro y segundo nivel claro.',
        'vertical-hybrid-header-first_detail': 'Primer nivel arriba y niveles secundarios a la izquierda.',
        horizontal_detail: 'Menú superior y contenido debajo.',
        'top-hybrid-sidebar-first_detail': 'Primer nivel a la izquierda y segundo nivel arriba.',
        'top-hybrid-header-first_detail': 'Primer nivel arriba y segundo nivel a la izquierda.'
      },
      tab: {
        title: 'Configuración de pestañas',
        visible: 'Mostrar pestañas',
        cache: 'Conservar información de pestañas',
        cacheTip: 'Conservar las pestañas al salir de una página',
        height: 'Altura de pestañas',
        mode: {
          title: 'Estilo de pestañas',
          slider: 'Deslizante',
          chrome: 'Chrome',
          button: 'Botones'
        },
        closeByMiddleClick: 'Cerrar con el botón central',
        closeByMiddleClickTip: 'Permitir cerrar una pestaña con el botón central del mouse'
      },
      header: {
        title: 'Configuración del encabezado',
        height: 'Altura del encabezado',
        breadcrumb: {
          visible: 'Mostrar migas de pan',
          showIcon: 'Mostrar icono de migas de pan'
        }
      },
      sider: {
        title: 'Configuración de barra lateral',
        inverted: 'Barra lateral oscura',
        width: 'Ancho de barra lateral',
        collapsedWidth: 'Ancho contraído',
        mixWidth: 'Ancho de barra lateral combinada',
        mixCollapsedWidth: 'Ancho contraído combinado',
        mixChildMenuWidth: 'Ancho del submenú combinado',
        autoSelectFirstMenu: 'Seleccionar primer submenú automáticamente',
        autoSelectFirstMenuTip: 'Al seleccionar un menú de primer nivel, navegar automáticamente al primer submenú.'
      },
      footer: {
        title: 'Configuración del pie de página',
        visible: 'Mostrar pie de página',
        fixed: 'Fijar pie de página',
        height: 'Altura del pie de página',
        right: 'Alinear a la derecha'
      },
      content: {
        title: 'Configuración del contenido',
        scrollMode: {
          title: 'Modo de desplazamiento',
          tip: 'Solo se desplaza el contenido principal; el contenedor exterior incluye encabezado y pie.',
          wrapper: 'Contenedor exterior',
          content: 'Contenido'
        },
        page: {
          animate: 'Animación de página',
          mode: {
            title: 'Tipo de animación',
            fade: 'Desvanecer',
            'fade-slide': 'Deslizar',
            'fade-bottom': 'Zoom desde abajo',
            'fade-scale': 'Desvanecer y escalar',
            'zoom-fade': 'Zoom y desvanecer',
            'zoom-out': 'Alejar',
            none: 'Ninguna'
          }
        },
        fixedHeaderAndTab: 'Fijar encabezado y pestañas'
      }
    },
    general: {
      title: 'Configuración general',
      watermark: {
        title: 'Configuración de marca de agua',
        visible: 'Mostrar marca de agua en pantalla completa',
        text: 'Texto personalizado de marca de agua',
        enableUserName: 'Mostrar nombre de usuario',
        enableTime: 'Mostrar hora actual',
        timeFormat: 'Formato de hora'
      },
      multilingual: {
        title: 'Configuración multilingüe',
        visible: 'Mostrar botón de idioma'
      },
      globalSearch: {
        title: 'Configuración de búsqueda global',
        visible: 'Mostrar búsqueda global'
      }
    },
    configOperation: {
      copyConfig: 'Copiar configuración',
      copySuccessMsg: 'Configuración copiada correctamente',
      resetConfig: 'Restablecer configuración',
      resetSuccessMsg: 'Configuración restablecida correctamente'
    }
  },
  route: {
    login: 'Iniciar sesión',
    403: 'Sin permiso',
    404: 'Página no encontrada',
    500: 'Error del servidor',
    'iframe-page': 'Página externa',
    home: 'Inicio',
    system: 'Administración del sistema',
    system_access: 'Usuarios y permisos',
    system_sso: 'Sistemas externos y SSO',
    system_operations: 'Auditoría y operaciones',
    system_access_user: 'Usuarios',
    'system_operations_erpnext-sync-log': 'Registros de sincronización ERPNext',
    'system_sso_oauth2-client': 'Aplicaciones OAuth2',
    'system_sso_oauth2-binding': 'Vinculación de cuentas OAuth2',
    'system_sso_external-system': 'Catálogo de sistemas externos',
    system_operations_audit: 'Auditoría de seguridad',
    system_access_permission: 'Permisos funcionales',
    system_access_role: 'Gestión de roles',
    material: 'Materiales',
    material_material: 'Datos maestros de materiales',
    material_unit: 'Unidades',
    'material_code-rule': 'Reglas de códigos',
    'mold-product': 'Moldes y productos',
    'mold-product_phone-model': 'Modelos de teléfono',
    'mold-product_color': 'Colores',
    'mold-product_mold-material': 'Materiales de moldes',
    'mold-product_mold-code': 'Códigos de moldes',
    'mold-product_mold': 'Moldes',
    'mold-product_product-code': 'Códigos de productos',
    'mold-product_product': 'Productos',
    'mold-product_erpnext-mapping': 'Mapeo con ERPNext',
    oa: 'Herramientas',
    'oa_box-label': 'Generador de etiquetas',
    oa_approval: 'Aprobaciones OA'
  },
  page: {
    login: {
      common: {
        loginOrRegister: 'Iniciar sesión / Registrarse',
        userNamePlaceholder: 'Ingresa el nombre de usuario',
        phonePlaceholder: 'Ingresa el número de teléfono',
        codePlaceholder: 'Ingresa el código de verificación',
        passwordPlaceholder: 'Ingresa la contraseña',
        confirmPasswordPlaceholder: 'Ingresa nuevamente la contraseña',
        codeLogin: 'Iniciar con código de verificación',
        confirm: 'Confirmar',
        back: 'Volver',
        validateSuccess: 'Verificación exitosa',
        loginSuccess: 'Sesión iniciada correctamente',
        welcomeBack: '¡Bienvenido de nuevo, {userName}!'
      },
      pwdLogin: {
        title: 'Iniciar con contraseña',
        rememberMe: 'Recordarme',
        forgetPassword: '¿Olvidaste la contraseña?',
        register: 'Crear cuenta',
        otherAccountLogin: 'Iniciar con otra cuenta',
        otherLoginMode: 'Otro método de inicio',
        superAdmin: 'Superadministrador',
        admin: 'Administrador',
        user: 'Usuario'
      },
      codeLogin: {
        title: 'Iniciar con código de verificación',
        getCode: 'Obtener código',
        reGetCode: 'Solicitar nuevamente en {time}s',
        sendCodeSuccess: 'Código enviado correctamente',
        imageCodePlaceholder: 'Ingresa el código de la imagen'
      },
      register: {
        title: 'Crear cuenta',
        agreement: 'He leído y acepto',
        protocol: 'el acuerdo de usuario',
        policy: 'la política de privacidad'
      },
      resetPwd: {
        title: 'Restablecer contraseña'
      },
      bindWeChat: {
        title: 'Vincular WeChat'
      },
      oauthConsent: {
        title: 'Autorización OAuth'
      }
    },
    home: {
      branchDesc: 'Espacio de trabajo empresarial para la gestión diaria.',
      projectCount: 'Proyectos',
      todo: 'Pendientes',
      message: 'Mensajes',
      downloadCount: 'Descargas',
      registerCount: 'Registros',
      schedule: 'Horario',
      study: 'Estudio',
      work: 'Trabajo',
      rest: 'Descanso',
      entertainment: 'Entretenimiento',
      visitCount: 'Visitas',
      turnover: 'Importe de ventas',
      dealCount: 'Operaciones',
      projectNews: {
        title: 'Novedades del proyecto',
        moreNews: 'Ver más',
        desc1: 'El sistema está listo para comenzar.',
        desc2: 'Se actualizó la configuración del espacio de trabajo.',
        desc3: 'Se preparó una nueva versión del sistema.',
        desc4: 'Se actualizaron los documentos del proyecto.',
        desc5: 'El panel de trabajo está listo para usarse.'
      },
      creativity: 'Creatividad',
      externalSystemsTitle: 'Sistemas',
      externalSystemsDesc: 'Acceso a plataformas empresariales conectadas',
      openInNewWindow: 'Abrir en una ventana nueva',
      externalSystems: {
        budget: 'Sistema presupuestario',
        erp: 'Sistema ERP',
        mes: 'Sistema MES',
        crm: 'Sistema CRM',
        lemos: 'Sistema lemos'
      }
    },
    oa: {
      approval: {
        searchPlaceholder: 'Ingresa el código de aprobación OA',
        search: 'Buscar',
        basicInfo: 'Información básica',
        formFields: 'Campos del formulario',
        timeline: 'Flujo de aprobación',
        pushToErp: 'Enviar a ERP',
        noResult: 'No se encontraron registros de aprobación',
        formName: 'Nombre del formulario',
        approvalCode: 'Código de aprobación',
        approvalStatus: 'Estado',
        creator: 'Creador',
        creatorDept: 'Departamento',
        createTime: 'Fecha de creación',
        ccList: 'Destinatarios en copia',
        viewInDingtalk: 'Ver en DingTalk',
        erpSync: {
          title: 'Enviar a ERP',
          org: 'Organización',
          orgPlaceholder: 'Selecciona una organización',
          supplier: 'Proveedor',
          supplierPlaceholder: 'Busca un proveedor',
          docDate: 'Fecha del documento',
          docDatePlaceholder: 'Selecciona la fecha del documento',
          oaCode: 'Código OA',
          waybill: 'Número de guía',
          waybillPlaceholder: 'Ingresa el número de guía',
          remark: 'Observaciones',
          remarkPlaceholder: 'Ingresa observaciones',
          pushSuccess: 'Enviado correctamente',
          pushFailed: 'Error al enviar'
        }
      }
    }
  },
  form: {
    required: 'Este campo es obligatorio',
    userName: {
      required: 'Ingresa el nombre de usuario',
      invalid: 'El nombre de usuario debe tener entre 4 y 16 caracteres y puede incluir letras, números, guiones y guiones bajos'
    },
    phone: {
      required: 'Ingresa el número de teléfono',
      invalid: 'El formato del teléfono no es válido'
    },
    pwd: {
      required: 'Ingresa la contraseña',
      invalid: 'La contraseña debe tener entre 6 y 18 caracteres e incluir letras, números y guiones bajos'
    },
    confirmPwd: {
      required: 'Ingresa nuevamente la contraseña',
      invalid: 'Las contraseñas no coinciden'
    },
    code: {
      required: 'Ingresa el código de verificación',
      invalid: 'El formato del código no es válido'
    },
    email: {
      required: 'Ingresa el correo electrónico',
      invalid: 'El formato del correo electrónico no es válido'
    }
  },
  dropdown: {
    closeCurrent: 'Cerrar',
    closeOther: 'Cerrar otras',
    closeLeft: 'Cerrar las de la izquierda',
    closeRight: 'Cerrar las de la derecha',
    closeAll: 'Cerrar todas',
    pin: 'Fijar pestaña',
    unpin: 'Desfijar pestaña'
  },
  icon: {
    themeConfig: 'Configuración del tema',
    themeSchema: 'Modo de tema',
    lang: 'Cambiar idioma',
    fullscreen: 'Pantalla completa',
    fullscreenExit: 'Salir de pantalla completa',
    reload: 'Recargar página',
    collapse: 'Contraer menú',
    expand: 'Expandir menú',
    pin: 'Fijar',
    unpin: 'Desfijar'
  },
  datatable: {
    itemCount: 'Total: {total}',
    fixed: {
      left: 'Fijar a la izquierda',
      right: 'Fijar a la derecha',
      unFixed: 'Dejar de fijar'
    }
  }
};

export default local;
