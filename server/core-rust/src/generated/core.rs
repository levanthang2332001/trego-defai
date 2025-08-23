/// Trading engine configuration parameters
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TradingParams {
    #[prost(string, tag = "1")]
    pub symbol: ::prost::alloc::string::String,
    #[prost(double, tag = "2")]
    pub min_spread_ticks: f64,
    #[prost(double, tag = "3")]
    pub max_inventory: f64,
    #[prost(double, tag = "4")]
    pub risk_sigma_ceiling: f64,
    #[prost(double, tag = "5")]
    pub max_daily_dd_pct: f64,
}
/// Risk management parameters
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct RiskParams {
    #[prost(double, tag = "1")]
    pub max_leverage: f64,
    #[prost(double, tag = "2")]
    pub max_position_size: f64,
    #[prost(bool, tag = "3")]
    pub allow_new_orders: bool,
}
/// Engine command
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct EngineCommand {
    #[prost(enumeration = "CommandType", tag = "1")]
    pub command: i32,
    #[prost(string, tag = "2")]
    pub reason: ::prost::alloc::string::String,
}
/// Real-time metrics from the trading engine
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Metric {
    #[prost(int64, tag = "1")]
    pub timestamp: i64,
    #[prost(string, tag = "2")]
    pub symbol: ::prost::alloc::string::String,
    #[prost(double, tag = "3")]
    pub mid_price: f64,
    #[prost(double, tag = "4")]
    pub sigma: f64,
    #[prost(double, tag = "5")]
    pub unrealized_pnl: f64,
    #[prost(string, tag = "6")]
    pub state: ::prost::alloc::string::String,
    #[prost(double, tag = "7")]
    pub inventory: f64,
    #[prost(int64, tag = "8")]
    pub heartbeat_counter: i64,
}
/// Request/Response messages
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct SetParamsRequest {
    #[prost(message, optional, tag = "1")]
    pub params: ::core::option::Option<TradingParams>,
}
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct SetParamsResponse {
    #[prost(bool, tag = "1")]
    pub success: bool,
    #[prost(string, tag = "2")]
    pub message: ::prost::alloc::string::String,
}
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct UpdateRiskRequest {
    #[prost(message, optional, tag = "1")]
    pub risk_params: ::core::option::Option<RiskParams>,
}
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct UpdateRiskResponse {
    #[prost(bool, tag = "1")]
    pub success: bool,
    #[prost(string, tag = "2")]
    pub message: ::prost::alloc::string::String,
}
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct SendCommandRequest {
    #[prost(message, optional, tag = "1")]
    pub command: ::core::option::Option<EngineCommand>,
}
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct SendCommandResponse {
    #[prost(bool, tag = "1")]
    pub success: bool,
    #[prost(string, tag = "2")]
    pub message: ::prost::alloc::string::String,
}
/// Empty for now, could add filtering later
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct StreamMetricsRequest {}
/// Command types for engine control
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
#[repr(i32)]
pub enum CommandType {
    Start = 0,
    Stop = 1,
    FlatAll = 2,
    PauseNew = 3,
    Resume = 4,
}
impl CommandType {
    /// String value of the enum field names used in the ProtoBuf definition.
    ///
    /// The values are not transformed in any way and thus are considered stable
    /// (if the ProtoBuf definition does not change) and safe for programmatic use.
    pub fn as_str_name(&self) -> &'static str {
        match self {
            CommandType::Start => "START",
            CommandType::Stop => "STOP",
            CommandType::FlatAll => "FLAT_ALL",
            CommandType::PauseNew => "PAUSE_NEW",
            CommandType::Resume => "RESUME",
        }
    }
    /// Creates an enum from field names used in the ProtoBuf definition.
    pub fn from_str_name(value: &str) -> ::core::option::Option<Self> {
        match value {
            "START" => Some(Self::Start),
            "STOP" => Some(Self::Stop),
            "FLAT_ALL" => Some(Self::FlatAll),
            "PAUSE_NEW" => Some(Self::PauseNew),
            "RESUME" => Some(Self::Resume),
            _ => None,
        }
    }
}
/// Generated client implementations.
pub mod trading_core_client {
    #![allow(unused_variables, dead_code, missing_docs, clippy::let_unit_value)]
    use tonic::codegen::*;
    use tonic::codegen::http::Uri;
    /// Core trading engine service
    #[derive(Debug, Clone)]
    pub struct TradingCoreClient<T> {
        inner: tonic::client::Grpc<T>,
    }
    impl TradingCoreClient<tonic::transport::Channel> {
        /// Attempt to create a new client by connecting to a given endpoint.
        pub async fn connect<D>(dst: D) -> Result<Self, tonic::transport::Error>
        where
            D: TryInto<tonic::transport::Endpoint>,
            D::Error: Into<StdError>,
        {
            let conn = tonic::transport::Endpoint::new(dst)?.connect().await?;
            Ok(Self::new(conn))
        }
    }
    impl<T> TradingCoreClient<T>
    where
        T: tonic::client::GrpcService<tonic::body::BoxBody>,
        T::Error: Into<StdError>,
        T::ResponseBody: Body<Data = Bytes> + Send + 'static,
        <T::ResponseBody as Body>::Error: Into<StdError> + Send,
    {
        pub fn new(inner: T) -> Self {
            let inner = tonic::client::Grpc::new(inner);
            Self { inner }
        }
        pub fn with_origin(inner: T, origin: Uri) -> Self {
            let inner = tonic::client::Grpc::with_origin(inner, origin);
            Self { inner }
        }
        pub fn with_interceptor<F>(
            inner: T,
            interceptor: F,
        ) -> TradingCoreClient<InterceptedService<T, F>>
        where
            F: tonic::service::Interceptor,
            T::ResponseBody: Default,
            T: tonic::codegen::Service<
                http::Request<tonic::body::BoxBody>,
                Response = http::Response<
                    <T as tonic::client::GrpcService<tonic::body::BoxBody>>::ResponseBody,
                >,
            >,
            <T as tonic::codegen::Service<
                http::Request<tonic::body::BoxBody>,
            >>::Error: Into<StdError> + Send + Sync,
        {
            TradingCoreClient::new(InterceptedService::new(inner, interceptor))
        }
        /// Compress requests with the given encoding.
        ///
        /// This requires the server to support it otherwise it might respond with an
        /// error.
        #[must_use]
        pub fn send_compressed(mut self, encoding: CompressionEncoding) -> Self {
            self.inner = self.inner.send_compressed(encoding);
            self
        }
        /// Enable decompressing responses.
        #[must_use]
        pub fn accept_compressed(mut self, encoding: CompressionEncoding) -> Self {
            self.inner = self.inner.accept_compressed(encoding);
            self
        }
        /// Limits the maximum size of a decoded message.
        ///
        /// Default: `4MB`
        #[must_use]
        pub fn max_decoding_message_size(mut self, limit: usize) -> Self {
            self.inner = self.inner.max_decoding_message_size(limit);
            self
        }
        /// Limits the maximum size of an encoded message.
        ///
        /// Default: `usize::MAX`
        #[must_use]
        pub fn max_encoding_message_size(mut self, limit: usize) -> Self {
            self.inner = self.inner.max_encoding_message_size(limit);
            self
        }
        /// Set trading parameters
        pub async fn set_params(
            &mut self,
            request: impl tonic::IntoRequest<super::SetParamsRequest>,
        ) -> std::result::Result<
            tonic::Response<super::SetParamsResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/core.TradingCore/SetParams",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(GrpcMethod::new("core.TradingCore", "SetParams"));
            self.inner.unary(req, path, codec).await
        }
        /// Update risk parameters
        pub async fn update_risk(
            &mut self,
            request: impl tonic::IntoRequest<super::UpdateRiskRequest>,
        ) -> std::result::Result<
            tonic::Response<super::UpdateRiskResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/core.TradingCore/UpdateRisk",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(GrpcMethod::new("core.TradingCore", "UpdateRisk"));
            self.inner.unary(req, path, codec).await
        }
        /// Send control commands
        pub async fn send_command(
            &mut self,
            request: impl tonic::IntoRequest<super::SendCommandRequest>,
        ) -> std::result::Result<
            tonic::Response<super::SendCommandResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/core.TradingCore/SendCommand",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(GrpcMethod::new("core.TradingCore", "SendCommand"));
            self.inner.unary(req, path, codec).await
        }
        /// Stream real-time metrics
        pub async fn stream_metrics(
            &mut self,
            request: impl tonic::IntoRequest<super::StreamMetricsRequest>,
        ) -> std::result::Result<
            tonic::Response<tonic::codec::Streaming<super::Metric>>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/core.TradingCore/StreamMetrics",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(GrpcMethod::new("core.TradingCore", "StreamMetrics"));
            self.inner.server_streaming(req, path, codec).await
        }
    }
}
/// Generated server implementations.
pub mod trading_core_server {
    #![allow(unused_variables, dead_code, missing_docs, clippy::let_unit_value)]
    use tonic::codegen::*;
    /// Generated trait containing gRPC methods that should be implemented for use with TradingCoreServer.
    #[async_trait]
    pub trait TradingCore: Send + Sync + 'static {
        /// Set trading parameters
        async fn set_params(
            &self,
            request: tonic::Request<super::SetParamsRequest>,
        ) -> std::result::Result<
            tonic::Response<super::SetParamsResponse>,
            tonic::Status,
        >;
        /// Update risk parameters
        async fn update_risk(
            &self,
            request: tonic::Request<super::UpdateRiskRequest>,
        ) -> std::result::Result<
            tonic::Response<super::UpdateRiskResponse>,
            tonic::Status,
        >;
        /// Send control commands
        async fn send_command(
            &self,
            request: tonic::Request<super::SendCommandRequest>,
        ) -> std::result::Result<
            tonic::Response<super::SendCommandResponse>,
            tonic::Status,
        >;
        /// Server streaming response type for the StreamMetrics method.
        type StreamMetricsStream: futures_core::Stream<
                Item = std::result::Result<super::Metric, tonic::Status>,
            >
            + Send
            + 'static;
        /// Stream real-time metrics
        async fn stream_metrics(
            &self,
            request: tonic::Request<super::StreamMetricsRequest>,
        ) -> std::result::Result<
            tonic::Response<Self::StreamMetricsStream>,
            tonic::Status,
        >;
    }
    /// Core trading engine service
    #[derive(Debug)]
    pub struct TradingCoreServer<T: TradingCore> {
        inner: _Inner<T>,
        accept_compression_encodings: EnabledCompressionEncodings,
        send_compression_encodings: EnabledCompressionEncodings,
        max_decoding_message_size: Option<usize>,
        max_encoding_message_size: Option<usize>,
    }
    struct _Inner<T>(Arc<T>);
    impl<T: TradingCore> TradingCoreServer<T> {
        pub fn new(inner: T) -> Self {
            Self::from_arc(Arc::new(inner))
        }
        pub fn from_arc(inner: Arc<T>) -> Self {
            let inner = _Inner(inner);
            Self {
                inner,
                accept_compression_encodings: Default::default(),
                send_compression_encodings: Default::default(),
                max_decoding_message_size: None,
                max_encoding_message_size: None,
            }
        }
        pub fn with_interceptor<F>(
            inner: T,
            interceptor: F,
        ) -> InterceptedService<Self, F>
        where
            F: tonic::service::Interceptor,
        {
            InterceptedService::new(Self::new(inner), interceptor)
        }
        /// Enable decompressing requests with the given encoding.
        #[must_use]
        pub fn accept_compressed(mut self, encoding: CompressionEncoding) -> Self {
            self.accept_compression_encodings.enable(encoding);
            self
        }
        /// Compress responses with the given encoding, if the client supports it.
        #[must_use]
        pub fn send_compressed(mut self, encoding: CompressionEncoding) -> Self {
            self.send_compression_encodings.enable(encoding);
            self
        }
        /// Limits the maximum size of a decoded message.
        ///
        /// Default: `4MB`
        #[must_use]
        pub fn max_decoding_message_size(mut self, limit: usize) -> Self {
            self.max_decoding_message_size = Some(limit);
            self
        }
        /// Limits the maximum size of an encoded message.
        ///
        /// Default: `usize::MAX`
        #[must_use]
        pub fn max_encoding_message_size(mut self, limit: usize) -> Self {
            self.max_encoding_message_size = Some(limit);
            self
        }
    }
    impl<T, B> tonic::codegen::Service<http::Request<B>> for TradingCoreServer<T>
    where
        T: TradingCore,
        B: Body + Send + 'static,
        B::Error: Into<StdError> + Send + 'static,
    {
        type Response = http::Response<tonic::body::BoxBody>;
        type Error = std::convert::Infallible;
        type Future = BoxFuture<Self::Response, Self::Error>;
        fn poll_ready(
            &mut self,
            _cx: &mut Context<'_>,
        ) -> Poll<std::result::Result<(), Self::Error>> {
            Poll::Ready(Ok(()))
        }
        fn call(&mut self, req: http::Request<B>) -> Self::Future {
            let inner = self.inner.clone();
            match req.uri().path() {
                "/core.TradingCore/SetParams" => {
                    #[allow(non_camel_case_types)]
                    struct SetParamsSvc<T: TradingCore>(pub Arc<T>);
                    impl<
                        T: TradingCore,
                    > tonic::server::UnaryService<super::SetParamsRequest>
                    for SetParamsSvc<T> {
                        type Response = super::SetParamsResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::SetParamsRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move { (*inner).set_params(request).await };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = SetParamsSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/core.TradingCore/UpdateRisk" => {
                    #[allow(non_camel_case_types)]
                    struct UpdateRiskSvc<T: TradingCore>(pub Arc<T>);
                    impl<
                        T: TradingCore,
                    > tonic::server::UnaryService<super::UpdateRiskRequest>
                    for UpdateRiskSvc<T> {
                        type Response = super::UpdateRiskResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::UpdateRiskRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move { (*inner).update_risk(request).await };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = UpdateRiskSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/core.TradingCore/SendCommand" => {
                    #[allow(non_camel_case_types)]
                    struct SendCommandSvc<T: TradingCore>(pub Arc<T>);
                    impl<
                        T: TradingCore,
                    > tonic::server::UnaryService<super::SendCommandRequest>
                    for SendCommandSvc<T> {
                        type Response = super::SendCommandResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::SendCommandRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                (*inner).send_command(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = SendCommandSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/core.TradingCore/StreamMetrics" => {
                    #[allow(non_camel_case_types)]
                    struct StreamMetricsSvc<T: TradingCore>(pub Arc<T>);
                    impl<
                        T: TradingCore,
                    > tonic::server::ServerStreamingService<super::StreamMetricsRequest>
                    for StreamMetricsSvc<T> {
                        type Response = super::Metric;
                        type ResponseStream = T::StreamMetricsStream;
                        type Future = BoxFuture<
                            tonic::Response<Self::ResponseStream>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::StreamMetricsRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                (*inner).stream_metrics(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = StreamMetricsSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.server_streaming(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                _ => {
                    Box::pin(async move {
                        Ok(
                            http::Response::builder()
                                .status(200)
                                .header("grpc-status", "12")
                                .header("content-type", "application/grpc")
                                .body(empty_body())
                                .unwrap(),
                        )
                    })
                }
            }
        }
    }
    impl<T: TradingCore> Clone for TradingCoreServer<T> {
        fn clone(&self) -> Self {
            let inner = self.inner.clone();
            Self {
                inner,
                accept_compression_encodings: self.accept_compression_encodings,
                send_compression_encodings: self.send_compression_encodings,
                max_decoding_message_size: self.max_decoding_message_size,
                max_encoding_message_size: self.max_encoding_message_size,
            }
        }
    }
    impl<T: TradingCore> Clone for _Inner<T> {
        fn clone(&self) -> Self {
            Self(Arc::clone(&self.0))
        }
    }
    impl<T: std::fmt::Debug> std::fmt::Debug for _Inner<T> {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{:?}", self.0)
        }
    }
    impl<T: TradingCore> tonic::server::NamedService for TradingCoreServer<T> {
        const NAME: &'static str = "core.TradingCore";
    }
}
