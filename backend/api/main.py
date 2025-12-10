from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import csv
import io
import sys
import os
from typing import Optional, List

# Agregar el directorio scheduler al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scheduler"))

from database.connection import get_db, engine, Base
from database.models import (
    Maestro,
    Materia,
    Grupo,
    HorarioGenerado,
    Asignacion,
    MaestroMateria,
    DisponibilidadMaestro,
    PlanEstudios,
)

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

# Inicializar FastAPI
app = FastAPI(title="Generador de Horarios Universitarios")

# Configurar CORS para permitir peticiones desde React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "API de Generador de Horarios Universitarios"}


@app.post("/api/maestros/upload-csv")
async def upload_maestros_csv(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    """
    Carga maestros desde un archivo CSV
    Formato esperado: nombre,email,horas_max_semana,materias,dias_disponibles

    - horas_max_semana: máximo de horas que puede dar por semana (por defecto 15)
    - materias: lista separada por | de nombres de materias que puede impartir
    - dias_disponibles: numeros separados por | (0=Lun, 1=Mar, 2=Mie, 3=Jue, 4=Vie, 5=Sab)

    Ejemplo:
    nombre,email,horas_max_semana,materias,dias_disponibles
    Dr. Juan Perez,juan@upv.edu.mx,15,INGLES I|INGLES II|INGLES III,0|1|2|3|4|5
    """
    try:
        # Leer archivo CSV
        contents = await file.read()
        decoded_content = contents.decode("utf-8")
        csv_reader = csv.DictReader(io.StringIO(decoded_content))

        # Validar columnas requeridas
        required_columns = ["nombre", "email"]
        fieldnames = csv_reader.fieldnames

        if not fieldnames or not all(col in fieldnames for col in required_columns):
            raise HTTPException(
                status_code=400,
                detail=f"El CSV debe contener las columnas: {', '.join(required_columns)}",
            )

        maestros_creados = []
        errores = []

        # Insertar maestros en la base de datos
        for idx, row in enumerate(csv_reader, start=2):
            try:
                # Obtener horas_max_semana, usar 15 por defecto si no existe
                horas_max_semana = row.get("horas_max_semana", "15")
                try:
                    horas_max_semana = int(horas_max_semana)
                except ValueError:
                    horas_max_semana = 15

                maestro = Maestro(
                    nombre=row["nombre"].strip(),
                    email=row["email"].strip(),
                    numero=row.get("numero", "").strip(),
                    horas_max_semana=horas_max_semana,
                )
                db.add(maestro)
                db.flush()  # Para obtener el ID

                # Procesar materias (separadas por |)
                materias_str = row.get("materias", "")
                if materias_str:
                    nombres_materias = [
                        m.strip().upper() for m in materias_str.split("|") if m.strip()
                    ]
                    for nombre_materia in nombres_materias:
                        # Buscar materia por nombre (case insensitive)
                        materia = (
                            db.query(Materia)
                            .filter(Materia.nombre.ilike(f"%{nombre_materia}%"))
                            .first()
                        )
                        if materia:
                            maestro_materia = MaestroMateria(
                                maestro_id=maestro.id, materia_id=materia.id
                            )
                            db.add(maestro_materia)

                # Procesar dias disponibles (separados por |)
                dias_str = row.get("dias_disponibles", "0|1|2|3|4|5")
                if dias_str:
                    dias = []
                    for d in dias_str.split("|"):
                        try:
                            dia = int(d.strip())
                            if 0 <= dia <= 5:
                                dias.append(dia)
                        except ValueError:
                            pass

                    if not dias:
                        dias = [0, 1, 2, 3, 4, 5]  # Por defecto todos los dias

                    for dia in dias:
                        disponibilidad = DisponibilidadMaestro(
                            maestro_id=maestro.id,
                            dia_semana=dia,
                            hora_inicio=7,
                            hora_fin=22,
                        )
                        db.add(disponibilidad)

                maestros_creados.append(maestro.nombre)
            except Exception as e:
                errores.append(f"Fila {idx}: {str(e)}")

        db.commit()

        result = {
            "message": f"Se cargaron {len(maestros_creados)} maestros exitosamente",
            "maestros": maestros_creados,
        }

        if errores:
            result["errores"] = errores

        return result

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al procesar CSV: {str(e)}")


@app.get("/api/maestros")
def get_maestros(db: Session = Depends(get_db)):
    """Obtiene todos los maestros registrados"""
    maestros = db.query(Maestro).all()
    total = len(maestros)

    return {
        "total": total,
        "minimo_maestros": MINIMO_MAESTROS,
        "puede_eliminar": total > MINIMO_MAESTROS,
        "grupos_base_por_cuatrimestre": GRUPOS_BASE,
        "maestros_por_grupo_extra": MAESTROS_POR_GRUPO_EXTRA,  # 3 maestros por grupo extra
        "mensaje_grupos": f"Para agregar 1 grupo extra a cualquier cuatrimestre, necesitas aproximadamente {MAESTROS_POR_GRUPO_EXTRA} maestros adicionales.",
        "maestros": [
            {
                "id": m.id,
                "nombre": m.nombre,
                "email": m.email,
                "numero": m.numero if hasattr(m, "numero") else "",
                "horas_max_semana": m.horas_max_semana,
                "materias": (
                    [
                        {
                            "id": mm.materia_id,
                            "nombre": mm.materia.nombre,
                            "plan_estudios_id": mm.materia.plan_estudios_id,
                        }
                        for mm in m.materias
                    ]
                    if hasattr(m, "materias")
                    else []
                ),
                "disponibilidad_horaria": (
                    [
                        {
                            "dia_semana": d.dia_semana,
                            "slot_id": d.slot_id if hasattr(d, "slot_id") else 0,
                            "hora_inicio": d.hora_inicio,
                            "hora_fin": d.hora_fin,
                        }
                        for d in m.disponibilidades
                    ]
                    if hasattr(m, "disponibilidades")
                    else []
                ),
                # Mantener compatibilidad: extraer días únicos
                "dias_disponibles": (
                    list(set(d.dia_semana for d in m.disponibilidades))
                    if hasattr(m, "disponibilidades")
                    else []
                ),
            }
            for m in maestros
        ],
    }


from pydantic import BaseModel


# Modelo para Plan de Estudios
class MateriaEnPlan(BaseModel):
    nombre: str
    horas_semanales: int
    cuatrimestre: int


class PlanEstudiosCreate(BaseModel):
    nombre: str
    descripcion: str = ""
    total_cuatrimestres: int = 10
    materias: List[MateriaEnPlan] = []


class PlanEstudiosUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    total_cuatrimestres: Optional[int] = None


class AgregarMateriasPlan(BaseModel):
    materias: List[MateriaEnPlan]


# Modelo para disponibilidad horaria por slot
class DisponibilidadSlot(BaseModel):
    dia_semana: int  # 0=Lunes, 4=Viernes
    slot_id: int  # 0-13 (slots de tiempo)
    hora_inicio: int  # 7-20
    hora_fin: int  # 8-21


# Modelo para crear maestro
class MaestroCreate(BaseModel):
    nombre: str
    email: str
    numero: str = ""
    horas_max_semana: int = 15  # Máximo 15 horas por semana
    materia_ids: list[int] = []
    disponibilidad_horaria: list[DisponibilidadSlot] = []  # Lista de slots disponibles


# Modelo para crear materia
class MateriaCreate(BaseModel):
    nombre: str
    horas_semanales: int


@app.post("/api/maestros")
def crear_maestro(maestro_data: MaestroCreate, db: Session = Depends(get_db)):
    """Crea un nuevo maestro individualmente"""
    try:
        # Crear maestro
        maestro = Maestro(
            nombre=maestro_data.nombre.strip(),
            email=maestro_data.email.strip(),
            numero=maestro_data.numero.strip() if maestro_data.numero else "",
            horas_max_semana=maestro_data.horas_max_semana,
        )
        db.add(maestro)
        db.commit()
        db.refresh(maestro)

        # Agregar materias que puede impartir
        for materia_id in maestro_data.materia_ids:
            maestro_materia = MaestroMateria(
                maestro_id=maestro.id, materia_id=materia_id
            )
            db.add(maestro_materia)

        # Agregar disponibilidad horaria por slots
        for slot in maestro_data.disponibilidad_horaria:
            disponibilidad = DisponibilidadMaestro(
                maestro_id=maestro.id,
                dia_semana=slot.dia_semana,
                slot_id=slot.slot_id,
                hora_inicio=slot.hora_inicio,
                hora_fin=slot.hora_fin,
            )
            db.add(disponibilidad)

        db.commit()

        return {
            "message": "Maestro creado exitosamente",
            "maestro": {
                "id": maestro.id,
                "nombre": maestro.nombre,
                "email": maestro.email,
                "numero": maestro.numero,
                "horas_max_semana": maestro.horas_max_semana,
                "materias": maestro_data.materia_ids,
                "disponibilidad_horaria": [
                    {
                        "dia_semana": s.dia_semana,
                        "slot_id": s.slot_id,
                        "hora_inicio": s.hora_inicio,
                        "hora_fin": s.hora_fin,
                    }
                    for s in maestro_data.disponibilidad_horaria
                ],
            },
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear maestro: {str(e)}")


@app.put("/api/maestros/{maestro_id}")
def actualizar_maestro(
    maestro_id: int, maestro_data: MaestroCreate, db: Session = Depends(get_db)
):
    """Actualiza un maestro existente"""
    try:
        maestro = db.query(Maestro).filter(Maestro.id == maestro_id).first()
        if not maestro:
            raise HTTPException(status_code=404, detail="Maestro no encontrado")

        # Actualizar datos básicos
        maestro.nombre = maestro_data.nombre.strip()
        maestro.email = maestro_data.email.strip()
        maestro.numero = maestro_data.numero.strip() if maestro_data.numero else ""
        maestro.horas_max_semana = maestro_data.horas_max_semana

        # Eliminar materias anteriores
        db.query(MaestroMateria).filter(
            MaestroMateria.maestro_id == maestro_id
        ).delete()

        # Agregar nuevas materias
        for materia_id in maestro_data.materia_ids:
            maestro_materia = MaestroMateria(
                maestro_id=maestro_id, materia_id=materia_id
            )
            db.add(maestro_materia)

        # Eliminar disponibilidades anteriores
        db.query(DisponibilidadMaestro).filter(
            DisponibilidadMaestro.maestro_id == maestro_id
        ).delete()

        # Agregar nuevas disponibilidades por slots
        for slot in maestro_data.disponibilidad_horaria:
            disponibilidad = DisponibilidadMaestro(
                maestro_id=maestro_id,
                dia_semana=slot.dia_semana,
                slot_id=slot.slot_id,
                hora_inicio=slot.hora_inicio,
                hora_fin=slot.hora_fin,
            )
            db.add(disponibilidad)

        db.commit()
        db.refresh(maestro)

        return {
            "message": "Maestro actualizado exitosamente",
            "maestro": {
                "id": maestro.id,
                "nombre": maestro.nombre,
                "email": maestro.email,
                "numero": maestro.numero,
                "horas_max_semana": maestro.horas_max_semana,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar maestro: {str(e)}"
        )


# Constantes para cálculo de maestros
MINIMO_MAESTROS = 40  # Mínimo para 2 grupos por cuatrimestre
GRUPOS_BASE = 2  # Grupos por cuatrimestre en configuración base
CUATRIMESTRES_ACTIVOS = 8  # Cuatrimestres que no son estadía (1-5, 7-9)
HORAS_PROMEDIO_GRUPO = 35  # Horas semanales promedio por grupo
HORAS_MAX_MAESTRO = 15  # Horas máximas por semana por maestro
MAESTROS_POR_GRUPO_EXTRA = 3  # Maestros adicionales necesarios por cada grupo extra


@app.delete("/api/maestros/{maestro_id}")
def eliminar_maestro(maestro_id: int, db: Session = Depends(get_db)):
    """Elimina un maestro (no permite si hay menos de 40 maestros)"""
    try:
        # Verificar cantidad mínima de maestros
        total_maestros = db.query(Maestro).count()
        if total_maestros <= MINIMO_MAESTROS:
            raise HTTPException(
                status_code=400,
                detail=f"No se puede eliminar. Se requiere un mínimo de {MINIMO_MAESTROS} maestros para cubrir todos los horarios. Actualmente hay {total_maestros} maestros.",
            )

        maestro = db.query(Maestro).filter(Maestro.id == maestro_id).first()
        if not maestro:
            raise HTTPException(status_code=404, detail="Maestro no encontrado")

        db.delete(maestro)
        db.commit()

        return {"message": f"Maestro {maestro.nombre} eliminado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar maestro: {str(e)}"
        )


# ==================== ENDPOINTS DE PLAN DE ESTUDIOS ====================


@app.post("/api/planes-estudios")
def crear_plan_estudios(plan_data: PlanEstudiosCreate, db: Session = Depends(get_db)):
    """Crea un nuevo plan de estudios con sus materias"""
    try:
        # Crear el plan de estudios
        plan = PlanEstudios(
            nombre=plan_data.nombre.strip(),
            descripcion=plan_data.descripcion.strip() if plan_data.descripcion else "",
            total_cuatrimestres=plan_data.total_cuatrimestres,
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)

        # Agregar las materias del plan
        materias_creadas = []
        for mat_data in plan_data.materias:
            materia = Materia(
                nombre=mat_data.nombre.strip(),
                horas_semanales=mat_data.horas_semanales,
                cuatrimestre=mat_data.cuatrimestre,
                plan_estudios_id=plan.id,
            )
            db.add(materia)
            materias_creadas.append(
                {
                    "nombre": materia.nombre,
                    "horas_semanales": materia.horas_semanales,
                    "cuatrimestre": materia.cuatrimestre,
                }
            )

        db.commit()

        return {
            "message": f"Plan de estudios '{plan.nombre}' creado exitosamente con {len(materias_creadas)} materias",
            "plan": {
                "id": plan.id,
                "nombre": plan.nombre,
                "descripcion": plan.descripcion,
                "total_cuatrimestres": plan.total_cuatrimestres,
                "materias": materias_creadas,
            },
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al crear plan de estudios: {str(e)}"
        )


@app.get("/api/planes-estudios")
def get_planes_estudios(db: Session = Depends(get_db)):
    """Obtiene todos los planes de estudio con sus materias"""
    planes = db.query(PlanEstudios).all()

    result = []
    for plan in planes:
        materias_por_cuatrimestre = {}
        for materia in plan.materias:
            cuatri = materia.cuatrimestre
            if cuatri not in materias_por_cuatrimestre:
                materias_por_cuatrimestre[cuatri] = []
            materias_por_cuatrimestre[cuatri].append(
                {
                    "id": materia.id,
                    "nombre": materia.nombre,
                    "horas_semanales": materia.horas_semanales,
                }
            )

        result.append(
            {
                "id": plan.id,
                "nombre": plan.nombre,
                "descripcion": plan.descripcion,
                "total_cuatrimestres": plan.total_cuatrimestres,
                "total_materias": len(plan.materias),
                "materias_por_cuatrimestre": materias_por_cuatrimestre,
            }
        )

    return {
        "total": len(planes),
        "planes": result,
    }


@app.get("/api/planes-estudios/{plan_id}")
def get_plan_estudios(plan_id: int, db: Session = Depends(get_db)):
    """Obtiene un plan de estudios especifico con sus materias"""
    plan = db.query(PlanEstudios).filter(PlanEstudios.id == plan_id).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Plan de estudios no encontrado")

    materias_por_cuatrimestre = {}
    for materia in plan.materias:
        cuatri = materia.cuatrimestre
        if cuatri not in materias_por_cuatrimestre:
            materias_por_cuatrimestre[cuatri] = []
        materias_por_cuatrimestre[cuatri].append(
            {
                "id": materia.id,
                "nombre": materia.nombre,
                "horas_semanales": materia.horas_semanales,
            }
        )

    return {
        "id": plan.id,
        "nombre": plan.nombre,
        "descripcion": plan.descripcion,
        "total_cuatrimestres": plan.total_cuatrimestres,
        "total_materias": len(plan.materias),
        "materias_por_cuatrimestre": materias_por_cuatrimestre,
    }


@app.get("/api/planes-estudios/{plan_id}/cuatrimestre/{cuatrimestre}")
def get_materias_cuatrimestre(
    plan_id: int, cuatrimestre: int, db: Session = Depends(get_db)
):
    """Obtiene las materias de un cuatrimestre especifico de un plan"""
    plan = db.query(PlanEstudios).filter(PlanEstudios.id == plan_id).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Plan de estudios no encontrado")

    materias = (
        db.query(Materia)
        .filter(
            Materia.plan_estudios_id == plan_id, Materia.cuatrimestre == cuatrimestre
        )
        .all()
    )

    return {
        "plan": plan.nombre,
        "cuatrimestre": cuatrimestre,
        "materias": [
            {
                "id": m.id,
                "nombre": m.nombre,
                "horas_semanales": m.horas_semanales,
            }
            for m in materias
        ],
    }


@app.delete("/api/planes-estudios/{plan_id}")
def eliminar_plan_estudios(plan_id: int, db: Session = Depends(get_db)):
    """Elimina un plan de estudios y todas sus materias"""
    try:
        plan = db.query(PlanEstudios).filter(PlanEstudios.id == plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=404, detail="Plan de estudios no encontrado"
            )

        db.delete(plan)
        db.commit()

        return {"message": f"Plan de estudios '{plan.nombre}' eliminado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar plan de estudios: {str(e)}"
        )


@app.put("/api/planes-estudios/{plan_id}")
def actualizar_plan_estudios(
    plan_id: int, plan_data: PlanEstudiosUpdate, db: Session = Depends(get_db)
):
    """Actualiza un plan de estudios existente"""
    try:
        plan = db.query(PlanEstudios).filter(PlanEstudios.id == plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=404, detail="Plan de estudios no encontrado"
            )

        if plan_data.nombre is not None:
            plan.nombre = plan_data.nombre.strip()
        if plan_data.descripcion is not None:
            plan.descripcion = plan_data.descripcion.strip()
        if plan_data.total_cuatrimestres is not None:
            plan.total_cuatrimestres = plan_data.total_cuatrimestres

        db.commit()
        db.refresh(plan)

        return {
            "message": f"Plan de estudios '{plan.nombre}' actualizado exitosamente",
            "plan": {
                "id": plan.id,
                "nombre": plan.nombre,
                "descripcion": plan.descripcion,
                "total_cuatrimestres": plan.total_cuatrimestres,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar plan de estudios: {str(e)}"
        )


@app.post("/api/planes-estudios/{plan_id}/materias")
def agregar_materias_plan(
    plan_id: int, materias_data: AgregarMateriasPlan, db: Session = Depends(get_db)
):
    """Agrega materias a un plan de estudios existente"""
    try:
        plan = db.query(PlanEstudios).filter(PlanEstudios.id == plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=404, detail="Plan de estudios no encontrado"
            )

        materias_creadas = []
        for mat_data in materias_data.materias:
            materia = Materia(
                nombre=mat_data.nombre.strip(),
                horas_semanales=mat_data.horas_semanales,
                cuatrimestre=mat_data.cuatrimestre,
                plan_estudios_id=plan.id,
            )
            db.add(materia)
            materias_creadas.append(
                {
                    "nombre": materia.nombre,
                    "horas_semanales": materia.horas_semanales,
                    "cuatrimestre": materia.cuatrimestre,
                }
            )

        db.commit()

        return {
            "message": f"Se agregaron {len(materias_creadas)} materias al plan '{plan.nombre}'",
            "materias_agregadas": materias_creadas,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al agregar materias: {str(e)}"
        )


@app.delete("/api/planes-estudios/{plan_id}/materias/{materia_id}")
def eliminar_materia_plan(plan_id: int, materia_id: int, db: Session = Depends(get_db)):
    """Elimina una materia de un plan de estudios"""
    try:
        materia = (
            db.query(Materia)
            .filter(Materia.id == materia_id, Materia.plan_estudios_id == plan_id)
            .first()
        )
        if not materia:
            raise HTTPException(
                status_code=404, detail="Materia no encontrada en este plan"
            )

        nombre = materia.nombre
        db.delete(materia)
        db.commit()

        return {"message": f"Materia '{nombre}' eliminada exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar materia: {str(e)}"
        )


# ==================== ENDPOINTS DE MATERIAS ====================


@app.post("/api/materias")
def crear_materia(materia_data: MateriaCreate, db: Session = Depends(get_db)):
    """Crea una nueva materia"""
    try:
        materia = Materia(
            nombre=materia_data.nombre.strip(),
            horas_semanales=materia_data.horas_semanales,
        )
        db.add(materia)
        db.commit()
        db.refresh(materia)
        return {
            "message": "Materia creada exitosamente",
            "materia": {
                "id": materia.id,
                "nombre": materia.nombre,
                "horas_semanales": materia.horas_semanales,
            },
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear materia: {str(e)}")


@app.get("/api/materias")
def get_materias(db: Session = Depends(get_db)):
    """Obtiene todas las materias"""
    materias = db.query(Materia).all()
    return {
        "total": len(materias),
        "materias": [
            {
                "id": m.id,
                "nombre": m.nombre,
                "horas_semanales": m.horas_semanales,
                "cuatrimestre": m.cuatrimestre,
                "plan_estudios_id": m.plan_estudios_id,
            }
            for m in materias
        ],
    }


@app.put("/api/materias/{materia_id}")
def actualizar_materia(
    materia_id: int, materia_data: MateriaCreate, db: Session = Depends(get_db)
):
    """Actualiza una materia existente"""
    try:
        materia = db.query(Materia).filter(Materia.id == materia_id).first()
        if not materia:
            raise HTTPException(status_code=404, detail="Materia no encontrada")

        materia.nombre = materia_data.nombre.strip()
        materia.horas_semanales = materia_data.horas_semanales

        db.commit()
        db.refresh(materia)

        return {
            "message": "Materia actualizada exitosamente",
            "materia": {
                "id": materia.id,
                "nombre": materia.nombre,
                "horas_semanales": materia.horas_semanales,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar materia: {str(e)}"
        )


@app.delete("/api/materias/{materia_id}")
def eliminar_materia(materia_id: int, db: Session = Depends(get_db)):
    """Elimina una materia"""
    try:
        materia = db.query(Materia).filter(Materia.id == materia_id).first()
        if not materia:
            raise HTTPException(status_code=404, detail="Materia no encontrada")

        db.delete(materia)
        db.commit()

        return {"message": f"Materia {materia.nombre} eliminada exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar materia: {str(e)}"
        )


@app.post("/api/grupos")
def crear_grupo(nombre: str, semestre: int, db: Session = Depends(get_db)):
    """Crea un nuevo grupo"""
    grupo = Grupo(nombre=nombre, semestre=semestre)
    db.add(grupo)
    db.commit()
    db.refresh(grupo)
    return {"id": grupo.id, "nombre": grupo.nombre, "semestre": grupo.semestre}


@app.get("/api/grupos")
def get_grupos(db: Session = Depends(get_db)):
    """Obtiene todos los grupos"""
    grupos = db.query(Grupo).all()
    return {
        "total": len(grupos),
        "grupos": [
            {"id": g.id, "nombre": g.nombre, "semestre": g.semestre} for g in grupos
        ],
    }


# Modelo para generar horario
class GenerarHorarioRequest(BaseModel):
    plan_id: int  # ID del plan de estudios (obligatorio)
    maestro_ids: list[int]
    cuatrimestres_seleccionados: list[int] = (
        []
    )  # Lista de cuatrimestres a generar (vacío = todos)
    grupos_por_cuatrimestre: dict[int, int] = (
        {}
    )  # {cuatrimestre: num_grupos} ej: {1: 2, 2: 3, 3: 2}
    grupos_generar: int = 2  # Valor por defecto si no se especifica por cuatrimestre
    turno: str = "matutino"


# Cuatrimestres de estadía (no tienen horario de clases)
CUATRIMESTRES_ESTADIA = [6, 10]


@app.post("/api/generar-horario")
def generar_horario(
    request: GenerarHorarioRequest,
    db: Session = Depends(get_db),
):
    """
    Genera horarios para TODOS los cuatrimestres de un plan de estudios.
    Excluye automaticamente los cuatrimestres de estadia (5 y 10).
    Formato de grupos: NOMBRE_PLAN CUATRIMESTRE-N (ej: LITI 1-1, LITI 2-1, etc.)

    Considera:
    - Las materias de cada cuatrimestre
    - Solo los docentes seleccionados
    - Las materias que cada docente puede impartir
    - Las horas maximas por dia de cada docente (creditos = horas semanales)
    - Los dias disponibles de cada docente (Lunes a Sabado)
    """
    try:
        # Importar el modulo Cython compilado
        import scheduler

        # Extraer datos del request
        plan_id = request.plan_id
        maestro_ids = request.maestro_ids
        cuatrimestres_seleccionados = (
            request.cuatrimestres_seleccionados
        )  # Lista de cuatrimestres a generar
        grupos_por_cuatrimestre = (
            request.grupos_por_cuatrimestre
        )  # Dict con grupos específicos por cuatrimestre
        grupos_default = (
            request.grupos_generar
        )  # Valor por defecto si no está en el dict
        turno = request.turno

        # Validaciones
        if not maestro_ids:
            raise HTTPException(
                status_code=400, detail="Debe seleccionar al menos un docente"
            )

        # Obtener el plan de estudios
        plan = db.query(PlanEstudios).filter(PlanEstudios.id == plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=404, detail="Plan de estudios no encontrado"
            )

        nombre_carrera = plan.nombre

        # Obtener los maestros seleccionados
        maestros = db.query(Maestro).filter(Maestro.id.in_(maestro_ids)).all()

        if not maestros:
            raise HTTPException(
                status_code=400, detail="No se encontraron los docentes seleccionados"
            )

        # ELIMINAR TODOS LOS HORARIOS Y GRUPOS ANTERIORES
        db.query(Asignacion).delete()
        db.query(HorarioGenerado).delete()
        db.query(Grupo).delete()
        db.commit()

        # Preparar datos de maestros (se reutiliza para todos los cuatrimestres)
        maestros_data = []
        for m in maestros:
            materias_puede_impartir = [mm.materia_id for mm in m.materias]

            # Obtener días disponibles únicos
            dias_disponibles = list(set(d.dia_semana for d in m.disponibilidades))
            if not dias_disponibles:
                dias_disponibles = [0, 1, 2, 3, 4]  # Lunes a Viernes por defecto

            # Crear estructura de disponibilidad horaria detallada
            # Formato: { (dia, hora): True } para cada slot disponible
            disponibilidad_horaria = {}
            for d in m.disponibilidades:
                # Marcar todas las horas dentro del slot como disponibles
                for hora in range(d.hora_inicio, d.hora_fin):
                    disponibilidad_horaria[(d.dia_semana, hora)] = True

            maestros_data.append(
                {
                    "id": m.id,
                    "nombre": m.nombre,
                    "horas_max_semana": m.horas_max_semana,  # Máximo 15 horas por semana
                    "materias_ids": materias_puede_impartir,
                    "dias_disponibles": dias_disponibles,
                    "disponibilidad_horaria": disponibilidad_horaria,
                }
            )

        total_asignaciones = 0
        horarios_creados = []
        cuatrimestres_generados = []

        # Determinar horas segun el turno
        if turno.lower() == "matutino":
            hora_min, hora_max = 7, 14  # 7:00 AM a 2:00 PM
        else:  # vespertino
            hora_min, hora_max = 14, 22  # 2:00 PM a 10:00 PM

        # ITERAR POR TODOS LOS CUATRIMESTRES (excepto estadias)
        for cuatrimestre in range(1, plan.total_cuatrimestres + 1):
            # Saltar cuatrimestres de estadia
            if cuatrimestre in CUATRIMESTRES_ESTADIA:
                continue

            # Si hay cuatrimestres seleccionados, solo procesar esos
            if (
                cuatrimestres_seleccionados
                and cuatrimestre not in cuatrimestres_seleccionados
            ):
                continue

            # Obtener materias del cuatrimestre
            materias_cuatrimestre = (
                db.query(Materia)
                .filter(
                    Materia.plan_estudios_id == plan_id,
                    Materia.cuatrimestre == cuatrimestre,
                )
                .all()
            )

            if not materias_cuatrimestre:
                continue  # Saltar si no hay materias

            cuatrimestres_generados.append(cuatrimestre)

            # Preparar datos de materias para este cuatrimestre
            materias_data = [
                {"id": m.id, "nombre": m.nombre, "horas_semanales": m.horas_semanales}
                for m in materias_cuatrimestre
            ]

            # Obtener número de grupos para este cuatrimestre específico
            # Si está en el diccionario usa ese valor, si no usa el default
            num_grupos_cuatri = grupos_por_cuatrimestre.get(
                cuatrimestre, grupos_default
            )

            # GENERAR UN HORARIO POR CADA GRUPO DE ESTE CUATRIMESTRE
            for grupo_num in range(1, num_grupos_cuatri + 1):
                nombre_grupo = f"{nombre_carrera} {cuatrimestre}-{grupo_num}"

                grupo = Grupo(
                    nombre=nombre_grupo,
                    semestre=cuatrimestre,
                )
                db.add(grupo)
                db.commit()
                db.refresh(grupo)

                grupos_data = [{"id": grupo.id, "nombre": grupo.nombre}]

                # Crear instancia del motor de horarios
                engine = scheduler.SchedulerEngine(
                    len(maestros), len(materias_cuatrimestre), 1, hora_min, hora_max
                )

                # Generar horario
                asignaciones = engine.generar_horario(
                    maestros_data, materias_data, grupos_data
                )

                if len(asignaciones) > 0:
                    horario = HorarioGenerado(estado="generado", turno=turno.lower())
                    db.add(horario)
                    db.commit()
                    db.refresh(horario)

                    for asig in asignaciones:
                        asignacion_db = Asignacion(
                            horario_id=horario.id,
                            maestro_id=asig["maestro_id"],
                            materia_id=asig["materia_id"],
                            grupo_id=grupo.id,
                            dia_semana=asig["dia_semana"],
                            hora_inicio=asig["hora_inicio"],
                            hora_fin=asig["hora_fin"],
                        )
                        db.add(asignacion_db)

                    db.commit()
                    total_asignaciones += len(asignaciones)
                    horarios_creados.append(
                        {
                            "horario_id": horario.id,
                            "grupo": grupo.nombre,
                            "cuatrimestre": cuatrimestre,
                            "asignaciones": len(asignaciones),
                        }
                    )
                else:
                    horarios_creados.append(
                        {
                            "horario_id": None,
                            "grupo": grupo.nombre,
                            "cuatrimestre": cuatrimestre,
                            "asignaciones": 0,
                        }
                    )

        # Calcular total de grupos generados
        total_grupos = sum(
            grupos_por_cuatrimestre.get(c, grupos_default)
            for c in cuatrimestres_generados
        )

        return {
            "message": f"Se generaron horarios para {len(cuatrimestres_generados)} cuatrimestres de {nombre_carrera}",
            "plan": nombre_carrera,
            "cuatrimestres_generados": cuatrimestres_generados,
            "cuatrimestres_estadia": [
                c for c in CUATRIMESTRES_ESTADIA if c <= plan.total_cuatrimestres
            ],
            "grupos_por_cuatrimestre": {
                c: grupos_por_cuatrimestre.get(c, grupos_default)
                for c in cuatrimestres_generados
            },
            "total_grupos": total_grupos,
            "turno": turno,
            "total_asignaciones": total_asignaciones,
            "horarios": horarios_creados,
        }

    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="El módulo Cython no está compilado. Ejecuta: cd backend/scheduler && python setup.py build_ext --inplace",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al generar horario: {str(e)}"
        )


@app.get("/api/horarios")
def get_horarios(db: Session = Depends(get_db)):
    """Obtiene todos los horarios generados"""
    horarios = (
        db.query(HorarioGenerado)
        .order_by(HorarioGenerado.fecha_generacion.desc())
        .all()
    )

    return {
        "total": len(horarios),
        "horarios": [
            {
                "id": h.id,
                "fecha_generacion": h.fecha_generacion,
                "estado": h.estado,
                "turno": h.turno if hasattr(h, "turno") else "matutino",
                "total_asignaciones": len(h.asignaciones),
            }
            for h in horarios
        ],
    }


@app.delete("/api/horarios")
def eliminar_todos_horarios(db: Session = Depends(get_db)):
    """Elimina todos los horarios generados"""
    try:
        # Eliminar todas las asignaciones primero
        db.query(Asignacion).delete()
        # Eliminar todos los horarios
        db.query(HorarioGenerado).delete()
        db.commit()

        return {"message": "Todos los horarios han sido eliminados exitosamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar horarios: {str(e)}"
        )


@app.get("/api/horarios/{horario_id}")
def get_horario(horario_id: int, db: Session = Depends(get_db)):
    """Obtiene un horario específico con todas sus asignaciones"""
    horario = db.query(HorarioGenerado).filter(HorarioGenerado.id == horario_id).first()

    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    asignaciones = (
        db.query(Asignacion).filter(Asignacion.horario_id == horario_id).all()
    )

    dias = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"]

    return {
        "id": horario.id,
        "fecha_generacion": horario.fecha_generacion,
        "estado": horario.estado,
        "turno": horario.turno if hasattr(horario, "turno") else "matutino",
        "asignaciones": [
            {
                "id": a.id,
                "maestro": db.query(Maestro).get(a.maestro_id).nombre,
                "materia": db.query(Materia).get(a.materia_id).nombre,
                "grupo": db.query(Grupo).get(a.grupo_id).nombre,
                "dia": dias[a.dia_semana],
                "hora_inicio": f"{a.hora_inicio}:00",
                "hora_fin": f"{a.hora_fin}:00",
            }
            for a in asignaciones
        ],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
