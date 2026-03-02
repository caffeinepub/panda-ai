import Runtime "mo:core/Runtime";

actor {
  public shared ({ caller }) func ping() : async () { () };

  public shared ({ caller }) func secretHealthCheck(_key : Text) : async () {
    Runtime.trap(
      "Healthcheck called with old version. In public ones you should not need a secret key.",
    );
  };
};
