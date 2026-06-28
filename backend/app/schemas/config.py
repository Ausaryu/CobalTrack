from pydantic import BaseModel, ConfigDict, Field


class PublicConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    app_name: str = Field(serialization_alias="appName")
    api_version: str = Field(serialization_alias="apiVersion")
