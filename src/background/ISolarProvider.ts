
export default interface ISolarProvider {
  findAPIKey: () => Promise<boolean>;
  clearCredentials(): void;
}