# scheduler.pyx - Motor de generación de horarios en Cython
# cython: language_level=3

from libc.stdlib cimport malloc, free, rand, srand
from libc.string cimport memset
from libc.time cimport time
import random

# Constantes
DEF MAX_MATERIAS = 10          # Máximo de materias diferentes por grupo
DEF MAX_HORAS_DIA = 8          # Máximo de horas de clase por día
DEF DIAS_SEMANA = 5            # Lunes a Viernes (sin Sábado)

# Estructura para representar una asignación
cdef struct Asignacion:
    int maestro_id
    int materia_id
    int grupo_id
    int dia_semana      # 0-4 (Lunes a Viernes)
    int hora_inicio     # 7-21
    int hora_fin

# Clase principal del motor de scheduling
cdef class SchedulerEngine:
    cdef int num_maestros
    cdef int num_materias
    cdef int num_grupos
    cdef int[5][14][100] ocupacion_maestros  # [dia][hora_slot][maestro_id] = 1 si ocupado
    cdef int[5][14][100] ocupacion_grupos    # [dia][hora_slot][grupo_id] = 1 si ocupado
    cdef int[100] horas_maestro_semana       # [maestro_id] = horas totales usadas en la semana
    cdef int hora_min
    cdef int hora_max

    def __init__(self, int maestros, int materias, int grupos, int hora_min=7, int hora_max=15):
        """Inicializa el motor de scheduling"""
        self.num_maestros = maestros
        self.num_materias = materias
        self.num_grupos = grupos
        self.hora_min = hora_min
        self.hora_max = hora_max

        # Inicializar matrices en 0
        memset(self.ocupacion_maestros, 0, sizeof(self.ocupacion_maestros))
        memset(self.ocupacion_grupos, 0, sizeof(self.ocupacion_grupos))
        memset(self.horas_maestro_semana, 0, sizeof(self.horas_maestro_semana))

        # Inicializar semilla random
        srand(time(NULL))
    
    cdef bint validar_disponibilidad_maestro(self, int maestro_id, int dia, int hora_inicio, int hora_fin):
        """Valida que el maestro esté disponible en el horario (no empalmes)"""
        cdef int hora
        for hora in range(hora_inicio, hora_fin):
            if hora - self.hora_min >= 0 and hora - self.hora_min < 14:
                if self.ocupacion_maestros[dia][hora - self.hora_min][maestro_id] == 1:
                    return False
        return True
    
    cdef bint validar_disponibilidad_grupo(self, int grupo_id, int dia, int hora_inicio, int hora_fin):
        """Valida que el grupo esté disponible en el horario (no empalmes)"""
        cdef int hora
        for hora in range(hora_inicio, hora_fin):
            if hora - self.hora_min >= 0 and hora - self.hora_min < 14:
                if self.ocupacion_grupos[dia][hora - self.hora_min][grupo_id] == 1:
                    return False
        return True
    
    cdef int contar_horas_grupo_dia(self, int grupo_id, int dia):
        """Cuenta cuántas horas tiene el grupo asignadas en un día"""
        cdef int contador = 0
        cdef int hora
        for hora in range(14):  # 14 slots posibles
            if self.ocupacion_grupos[dia][hora][grupo_id] == 1:
                contador += 1
        return contador
    
    cdef int obtener_siguiente_hora_libre(self, int grupo_id, int dia):
        """Obtiene la siguiente hora libre continua para el grupo en ese día"""
        cdef int hora
        cdef int primera_ocupada = -1
        cdef int ultima_ocupada = -1
        
        # Encontrar primera y última hora ocupada
        for hora in range(14):
            if self.ocupacion_grupos[dia][hora][grupo_id] == 1:
                if primera_ocupada == -1:
                    primera_ocupada = hora
                ultima_ocupada = hora
        
        # Si no hay horas ocupadas, empezar desde el inicio
        if primera_ocupada == -1:
            return self.hora_min
        
        # Retornar la siguiente hora después de la última ocupada
        return self.hora_min + ultima_ocupada + 1
    
    cdef void marcar_ocupado(self, int maestro_id, int grupo_id, int dia, int hora_inicio, int hora_fin):
        """Marca las horas como ocupadas para maestro y grupo"""
        cdef int hora
        cdef int duracion = hora_fin - hora_inicio
        for hora in range(hora_inicio, hora_fin):
            if hora - self.hora_min >= 0 and hora - self.hora_min < 14:
                self.ocupacion_maestros[dia][hora - self.hora_min][maestro_id] = 1
                self.ocupacion_grupos[dia][hora - self.hora_min][grupo_id] = 1
        # Actualizar contador de horas semanales del maestro
        if maestro_id < 100:
            self.horas_maestro_semana[maestro_id] += duracion
    
    cpdef list generar_horario(self, list maestros_data, list materias_data, list grupos_data):
        """
        Genera el horario completo distribuyendo materias de forma inteligente:
        - Máximo 7 materias diferentes por grupo
        - Distribuye las horas de cada materia en DIFERENTES días (no todo en un día)
        - Cada día tiene múltiples materias (similar a un horario universitario real)
        - Un maestro solo puede dar UNA materia a cada grupo
        - Sin empalmes de horarios
        - Bloques de 1 hora para mejor distribución
        
        Args:
            maestros_data: Lista de diccionarios con info de maestros
            materias_data: Lista de diccionarios con info de materias
            grupos_data: Lista de diccionarios con info de grupos
        
        Returns:
            Lista de asignaciones generadas
        """
        cdef list asignaciones = []
        cdef int max_horas_dia = MAX_HORAS_DIA
        cdef int max_materias = MAX_MATERIAS
        
        # Usar todas las materias (hasta el máximo)
        materias_a_usar = materias_data[:max_materias] if len(materias_data) > max_materias else materias_data
        
        # Crear índice de maestros por materia
        maestros_por_materia = {}
        for maestro in maestros_data:
            materias_maestro = maestro.get('materias_ids', [])
            for materia_id in materias_maestro:
                if materia_id not in maestros_por_materia:
                    maestros_por_materia[materia_id] = []
                maestros_por_materia[materia_id].append(maestro)
        
        # Mezclar para distribuir carga
        for materia_id in maestros_por_materia:
            random.shuffle(maestros_por_materia[materia_id])
        
        # Para cada grupo
        for grupo in grupos_data:
            grupo_id = grupo['id']
            
            # Diccionario para trackear qué maestro da qué materia a este grupo
            maestro_por_materia_grupo = {}  # materia_id -> maestro
            materias_maestro_grupo = {}     # maestro_id -> materia_id (un maestro solo da una materia)
            
            # Primero, asignar un maestro a cada materia
            for materia in materias_a_usar:
                materia_id = materia['id']
                
                if materia_id not in maestros_por_materia:
                    continue
                
                # Buscar un maestro que no esté dando otra materia a este grupo
                for m in maestros_por_materia[materia_id]:
                    if m['id'] not in materias_maestro_grupo:
                        maestro_por_materia_grupo[materia_id] = m
                        materias_maestro_grupo[m['id']] = materia_id
                        break
            
            # Crear lista de materias con sus horas semanales (creditos = horas)
            materias_con_horas = []
            for materia in materias_a_usar:
                materia_id = materia['id']
                if materia_id not in maestro_por_materia_grupo:
                    continue
                # Los creditos equivalen a horas semanales
                horas_semanales = materia['horas_semanales']
                materias_con_horas.append({
                    'id': materia_id,
                    'horas': horas_semanales,
                    'horas_asignadas': 0  # Para tracking
                })
            
            # ESTRATEGIA REALISTA (como horario universitario real):
            # - Horario de 7am a 2pm = 7 horas por día (o vespertino 2pm a 10pm = 8 horas)
            # - Cada materia se repite en múltiples días según sus créditos
            # - Distribuir las horas para cumplir exactamente los créditos semanales
            # - Lunes a Sábado disponibles
            
            # Calcular horas totales disponibles por semana (7 horas x 6 días = 42)
            horas_disponibles_dia = self.hora_max - self.hora_min
            
            # Calcular total de horas de todas las materias
            total_horas_materias = 0
            for m in materias_con_horas:
                total_horas_materias += m['horas']
            
            # Crear sesiones: distribuir materias en los días
            # Primero asignar 1 hora por día a cada materia (hasta completar sus horas)
            sesiones_por_dia = [[] for _ in range(DIAS_SEMANA)]  # Lista de (materia_id, duracion)
            horas_por_dia = [0] * DIAS_SEMANA
            materia_doble_dia = [-1] * DIAS_SEMANA  # Qué materia tiene 2 horas ese día (-1 = ninguna)
            
            # Ordenar materias por horas (más horas primero)
            for i in range(len(materias_con_horas)):
                for j in range(i + 1, len(materias_con_horas)):
                    if materias_con_horas[j]['horas'] > materias_con_horas[i]['horas']:
                        materias_con_horas[i], materias_con_horas[j] = materias_con_horas[j], materias_con_horas[i]
            
            # Primera pasada: asignar 1 hora por día a cada materia
            for materia_info in materias_con_horas:
                materia_id = materia_info['id']
                horas_restantes = materia_info['horas']
                dias_asignados = set()
                
                while horas_restantes > 0:
                    mejor_dia = -1
                    menor_carga = horas_disponibles_dia + 1
                    
                    # Buscar día sin esta materia y con menos carga
                    for d in range(DIAS_SEMANA):
                        if d not in dias_asignados and horas_por_dia[d] < horas_disponibles_dia:
                            if horas_por_dia[d] < menor_carga:
                                menor_carga = horas_por_dia[d]
                                mejor_dia = d
                    
                    # Si todos los días tienen esta materia, permitir repetir
                    if mejor_dia == -1:
                        for d in range(DIAS_SEMANA):
                            if horas_por_dia[d] < horas_disponibles_dia:
                                if horas_por_dia[d] < menor_carga:
                                    menor_carga = horas_por_dia[d]
                                    mejor_dia = d
                    
                    if mejor_dia != -1:
                        sesiones_por_dia[mejor_dia].append((materia_id, 1))
                        horas_por_dia[mejor_dia] += 1
                        dias_asignados.add(mejor_dia)
                        horas_restantes -= 1
                    else:
                        break
            
            # Segunda pasada: si algún día no llega a 7 horas, agregar más sesiones
            # Primero convertir UNA materia a 2 horas, luego agregar materias extra
            for dia in range(DIAS_SEMANA):
                # Paso 1: Convertir una materia a 2 horas si es necesario
                if horas_por_dia[dia] < horas_disponibles_dia and materia_doble_dia[dia] == -1:
                    for idx in range(len(sesiones_por_dia[dia])):
                        mid, dur = sesiones_por_dia[dia][idx]
                        if dur == 1:
                            sesiones_por_dia[dia][idx] = (mid, 2)
                            horas_por_dia[dia] += 1
                            materia_doble_dia[dia] = mid
                            break
                
                # Paso 2: Agregar más materias hasta llenar el día
                while horas_por_dia[dia] < horas_disponibles_dia:
                    agregada = False
                    
                    # Primero intentar materias que no estén en este día
                    for materia_info in materias_con_horas:
                        mid = materia_info['id']
                        ya_en_dia = False
                        for existing_mid, _ in sesiones_por_dia[dia]:
                            if existing_mid == mid:
                                ya_en_dia = True
                                break
                        
                        if not ya_en_dia:
                            sesiones_por_dia[dia].append((mid, 1))
                            horas_por_dia[dia] += 1
                            agregada = True
                            break
                    
                    # Si todas ya están, repetir cualquier materia
                    if not agregada:
                        if len(materias_con_horas) > 0:
                            # Rotar por las materias para no repetir siempre la misma
                            idx_materia = horas_por_dia[dia] % len(materias_con_horas)
                            mid = materias_con_horas[idx_materia]['id']
                            sesiones_por_dia[dia].append((mid, 1))
                            horas_por_dia[dia] += 1
                        else:
                            break
            
            # Copiar a bloques_por_dia
            bloques_por_dia = []
            for dia in range(DIAS_SEMANA):
                bloques_por_dia.append(sesiones_por_dia[dia][:])
            
            # CONSOLIDAR: Agrupar las horas de la misma materia en bloques continuos
            # En lugar de tener [(mat1,1), (mat2,1), (mat1,1)] -> [(mat1,2), (mat2,1)]
            bloques_consolidados = []
            for dia in range(DIAS_SEMANA):
                # Contar horas por materia en este día
                horas_materia_dia = {}
                for materia_id, duracion in bloques_por_dia[dia]:
                    if materia_id not in horas_materia_dia:
                        horas_materia_dia[materia_id] = 0
                    horas_materia_dia[materia_id] += duracion
                
                # Crear lista consolidada (cada materia aparece UNA sola vez con su duración total)
                dia_consolidado = []
                for materia_id, total_horas in horas_materia_dia.items():
                    dia_consolidado.append((materia_id, total_horas))
                
                bloques_consolidados.append(dia_consolidado)
            
            # Ahora asignar las sesiones (bloques continuos) por día
            for dia in range(DIAS_SEMANA):
                hora_actual = self.hora_min
                
                # Mezclar las sesiones del día para variar el orden
                sesiones_dia = bloques_consolidados[dia][:]
                random.shuffle(sesiones_dia)
                
                for materia_id, duracion in sesiones_dia:
                    if hora_actual + duracion > self.hora_max:
                        break
                    
                    maestro = maestro_por_materia_grupo.get(materia_id)
                    if not maestro:
                        continue
                    
                    maestro_id = maestro['id']
                    dias_disponibles = maestro.get('dias_disponibles', [0, 1, 2, 3, 4])
                    horas_max_semana = maestro.get('horas_max_semana', 15)  # 15 horas máximo por semana
                    disponibilidad_horaria = maestro.get('disponibilidad_horaria', {})
                    
                    # Verificar si el maestro puede dar clase este día
                    if dia not in dias_disponibles:
                        continue
                    
                    # Verificar disponibilidad horaria específica del maestro
                    # El maestro debe estar disponible para TODAS las horas del bloque
                    maestro_disponible_horas = True
                    for hora in range(hora_actual, hora_actual + duracion):
                        # Si hay disponibilidad_horaria definida, verificar cada hora
                        if disponibilidad_horaria:
                            if (dia, hora) not in disponibilidad_horaria:
                                maestro_disponible_horas = False
                                break
                    
                    if not maestro_disponible_horas:
                        continue
                    
                    # Verificar horas máximas semanales del maestro
                    horas_usadas_semana = 0
                    if maestro_id < 100:
                        horas_usadas_semana = self.horas_maestro_semana[maestro_id]
                    if horas_usadas_semana + duracion > horas_max_semana:
                        continue
                    
                    hora_fin = hora_actual + duracion
                    
                    # Verificar disponibilidad del maestro (sin empalmes) para todo el bloque
                    if not self.validar_disponibilidad_maestro(maestro_id, dia, hora_actual, hora_fin):
                        continue
                    
                    # Verificar disponibilidad del grupo para todo el bloque
                    if not self.validar_disponibilidad_grupo(grupo_id, dia, hora_actual, hora_fin):
                        continue
                    
                    # Realizar la asignación del bloque completo
                    self.marcar_ocupado(maestro_id, grupo_id, dia, hora_actual, hora_fin)
                    
                    asignaciones.append({
                        'maestro_id': maestro_id,
                        'materia_id': materia_id,
                        'grupo_id': grupo_id,
                        'dia_semana': dia,
                        'hora_inicio': hora_actual,
                        'hora_fin': hora_fin
                    })
                    
                    hora_actual = hora_fin
        
        return asignaciones
