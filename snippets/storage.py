"""
EdgeKit Storage Client for Python (Copy-Paste Snippet)

Copie este arquivo diretamente para o seu projeto (ex: `app/services/storage.py`).
Compatível com FastAPI, Django, Flask, Celery, scripts autônomos e automações.
Requer apenas a biblioteca `requests` (pip install requests).
"""

from typing import Optional, List, Dict, Any, Union, BinaryIO
import requests


class EdgeKitStorageError(Exception):
    """Exceção levantada quando a API do EdgeKit Storage retorna erro."""
    pass


class EdgeKitStorage:
    def __init__(self, base_url: str, api_key: str):
        """
        Inicializa o cliente EdgeKit Storage.

        :param base_url: URL base do seu Worker (ex: "https://storage-api.seudominio.com")
        :param api_key: Sua API Key secreta configurada no Worker
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key.strip()
        self.headers = {"X-API-Key": self.api_key}

    def upload(
        self,
        file: Union[BinaryIO, bytes, str],
        filename: Optional[str] = None,
        folder: Optional[str] = None,
        preserve_name: bool = False,
        custom_name: Optional[str] = None,
        is_private: bool = False,
    ) -> Dict[str, Any]:
        """
        Envia um arquivo para o Cloudflare R2 via EdgeKit Storage.

        :param file: Caminho local (str), bytes ou objeto de arquivo (BinaryIO / open('file', 'rb'))
        :param filename: Nome do arquivo com extensão (obrigatório se passar bytes ou stream sem name)
        :param folder: Subpasta no bucket (ex: "avatars", "produtos/2026")
        :param preserve_name: Se True, preserva o nome original com prefixo de ID único
        :param custom_name: Caminho/nome exato manual
        :param is_private: Se True, salva em rota privada protegida por chave/signed URL
        :return: Dict com key, url, size, mimeType, uploadedAt, etc.
        """
        opened_internally = False
        file_obj = None

        if isinstance(file, str):
            # Caminho de arquivo local
            file_obj = open(file, "rb")
            opened_internally = True
            if not filename:
                import os
                filename = os.path.basename(file)
        elif isinstance(file, bytes):
            file_obj = file
            if not filename:
                filename = "file.bin"
        else:
            file_obj = file
            if not filename and hasattr(file, "name"):
                import os
                filename = os.path.basename(file.name)
            elif not filename:
                filename = "upload.bin"

        try:
            files = {"file": (filename, file_obj)}
            data = {}
            if folder:
                data["folder"] = folder
            if preserve_name:
                data["preserveName"] = "true"
            if custom_name:
                data["customName"] = custom_name
            if is_private:
                data["private"] = "true"

            res = requests.post(
                f"{self.base_url}/upload",
                headers=self.headers,
                files=files,
                data=data,
            )

            res_json = res.json()
            if not res.ok or not res_json.get("success"):
                err_msg = res_json.get("error", {}).get("message", f"Falha no upload (Status {res.status_code})")
                raise EdgeKitStorageError(err_msg)

            return res_json.get("data", {})
        finally:
            if opened_internally and file_obj:
                file_obj.close()

    def get_signed_url(
        self,
        key: str,
        expires_in_seconds: int = 3600,
    ) -> Dict[str, Any]:
        """
        Gera uma URL temporária assinada com HMAC para download seguro de arquivo privado.

        :param key: Chave do arquivo no bucket (ex: "private/documentos/fatura.pdf")
        :param expires_in_seconds: Tempo de validade em segundos (padrão: 3600 = 1 hora)
        :return: Dict contendo url assinada, expiresAt, etc.
        """
        res = requests.post(
            f"{self.base_url}/api/signed-url",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"key": key, "expiresInSeconds": expires_in_seconds},
        )
        res_json = res.json()
        if not res.ok or not res_json.get("success"):
            err_msg = res_json.get("error", {}).get("message", f"Falha ao gerar signed URL (Status {res.status_code})")
            raise EdgeKitStorageError(err_msg)

        return res_json.get("data", {})

    def delete(self, key: str) -> bool:
        """
        Exclui um único arquivo do bucket R2.
        """
        clean_key = key.lstrip("/")
        res = requests.delete(
            f"{self.base_url}/api/files/{requests.utils.quote(clean_key, safe='')}",
            headers=self.headers,
        )
        res_json = res.json()
        if not res.ok or not res_json.get("success"):
            err_msg = res_json.get("error", {}).get("message", f"Falha ao deletar (Status {res.status_code})")
            raise EdgeKitStorageError(err_msg)

        return True

    def delete_many(self, keys: List[str]) -> bool:
        """
        Exclui múltiplos arquivos do bucket de uma só vez (deleção em lote).
        """
        res = requests.post(
            f"{self.base_url}/api/files/batch-delete",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"keys": keys},
        )
        res_json = res.json()
        if not res.ok or not res_json.get("success"):
            err_msg = res_json.get("error", {}).get("message", f"Falha na deleção em lote (Status {res.status_code})")
            raise EdgeKitStorageError(err_msg)

        return True

    def list(
        self,
        limit: int = 50,
        cursor: Optional[str] = None,
        prefix: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Lista arquivos salvos no bucket R2 com paginação.
        """
        params = {"limit": limit}
        if cursor:
            params["cursor"] = cursor
        if prefix:
            params["prefix"] = prefix

        res = requests.get(
            f"{self.base_url}/api/files",
            headers=self.headers,
            params=params,
        )
        res_json = res.json()
        if not res.ok or not res_json.get("success"):
            err_msg = res_json.get("error", {}).get("message", f"Falha ao listar (Status {res.status_code})")
            raise EdgeKitStorageError(err_msg)

        return res_json.get("data", {})
