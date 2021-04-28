# node:alpine will be our base image to create this image
FROM node:alpine
# Set the /app directory as working directory
WORKDIR /app
# Install ganache-cli globally
RUN npm install -g ganache-cli

# export port
EXPOSE 8545

# Set the default command for the image
CMD ["ganache-cli", "-h", "0.0.0.0", "--mnemonic", "someone sock acquire double double tennis reveal seat pen ignore cream balcony"]