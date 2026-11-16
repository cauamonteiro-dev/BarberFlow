FROM node:24-alpine AS frontend
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /build/backend
COPY backend/pom.xml ./
RUN mvn -B dependency:go-offline
COPY backend/src/ ./src/
COPY --from=frontend /build/frontend/dist/ ./src/main/resources/static/
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S -g 10001 barberflow && adduser -S -u 10001 -G barberflow barberflow
COPY --from=backend --chown=barberflow:barberflow /build/backend/target/barberflow-api-0.0.1-SNAPSHOT.jar /app/barberflow.jar
USER barberflow
ENV SPRING_PROFILES_ACTIVE=cloud
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65 -XX:+ExitOnOutOfMemoryError"
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/app/barberflow.jar"]
