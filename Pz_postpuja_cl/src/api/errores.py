"""Errores con el formato del contrato REST (docs/contrato/rest.md, sección 0):
{"code": "...", "message": "..."}. El gateway copia `code` a errors[].extensions.code."""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

ESTADO_HTTP = {"BAD_USER_INPUT": 400, "NOT_FOUND": 404, "INTERNAL": 500}


class ErrorApi(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message


def registrar_manejadores(app: FastAPI) -> None:
    @app.exception_handler(ErrorApi)
    async def error_api(_: Request, error: ErrorApi):
        return JSONResponse(
            status_code=ESTADO_HTTP[error.code],
            content={"code": error.code, "message": error.message},
        )

    @app.exception_handler(RequestValidationError)
    async def error_validacion(_: Request, error: RequestValidationError):
        campos = ", ".join(".".join(str(p) for p in e["loc"][1:]) for e in error.errors())
        return JSONResponse(
            status_code=400,
            content={"code": "BAD_USER_INPUT", "message": f"Datos inválidos: {campos}"},
        )
